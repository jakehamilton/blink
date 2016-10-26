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

var client_id = 'bm02n8wxxzqmzvfb0zlebd5ye2rn0r7';

var api = new _twitch2.default(client_id);
var db = new _storage2.default('blink');
var router = new _router2.default();

var OAUTH_TOKEN = db.load('oauth_token');

if (!OAUTH_TOKEN) {
  var hash = document.location.hash.substr(1, document.location.hash.length);
  var pairs = hash.split('&');
  pairs.forEach(function (pair) {
    var keys = pair.split('=');
    if (keys[0] == 'access_token') {
      OAUTH_TOKEN = keys[1];
      db.save('oauth_token', OAUTH_TOKEN);
      document.location.hash = '/';
    }
  });
}

window.addEventListener('load', function (event) {
  var player = new _player2.default('player-wrapper');

  router.add_route([{ 'videos': document.querySelector('#videos') }, { 'player': document.querySelector('#player') }, { 'search': document.querySelector('#search') }, { 'prompt': document.querySelector('#prompt') }]);

  if (!OAUTH_TOKEN) {
    router.route('prompt');
  } else {
    router.route('videos');
  }

  document.querySelector('.exit-btn').addEventListener('click', function (event) {
    player.destroy();
    router.route('videos');
  });

  _videoRow2.default.set_video_click_callback(function (video) {
    if (video.type == 'archive') {
      player.load({ video: video.id });
    } else if (video.type == 'stream') {
      player.load({ channel: video.channel.name });
    }
    router.route('player');
  });

  _videoRow2.default.set_navigation_callback(function (event) {
    if (event.section >= event.total_sections - 2 && event.data) {
      api.get_user_videos(event.data.username, event.data.limit, event.videos).then(function (response) {
        event.row.push(response.videos);
      });
    }
  });

  _heroSlide2.default.set_watch_now_callback(function (stream) {
    player.load({ channel: stream.name });
    router.route('player');
  });

  api.get_user(OAUTH_TOKEN).then(function (user) {
    api.get_user_stream_follows(OAUTH_TOKEN).then(function (streams) {
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

      var row = new _videoRow2.default('Live', streams);
      document.querySelector('#videos').appendChild(row.element);

      return;
    }).then(function () {
      api.get_follows(OAUTH_TOKEN, user.name).then(function (channels) {
        queue_rows(channels.follows).then(function () {});
      });
    });
  });

  var hero_highlight_spots = 1;
  var hero_spotlights = [];

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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvanMvYWpheC5qcyIsInNyYy9qcy9hcHAuanMiLCJzcmMvanMvaGVyby1zbGlkZS5qcyIsInNyYy9qcy9wbGF5ZXIuanMiLCJzcmMvanMvcG9zdGVyLmpzIiwic3JjL2pzL3JvdXRlci5qcyIsInNyYy9qcy9zdG9yYWdlLmpzIiwic3JjL2pzL3R3aXRjaC5qcyIsInNyYy9qcy92aWRlby1yb3cuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7Ozs7O0lDQU0sSTtBQUNKLGtCQUFjO0FBQUE7O0FBQ1osU0FBSyxPQUFMO0FBQ0Q7Ozs7d0JBRUcsRyxFQUFLLFMsRUFBVyxPLEVBQVM7QUFBQTs7QUFDM0IsYUFBTyxJQUFJLE9BQUosQ0FBWSxVQUFDLE9BQUQsRUFBVSxNQUFWLEVBQXFCO0FBQ3RDLGNBQUssT0FBTCxHQUFlLElBQUksY0FBSixFQUFmO0FBQ0EsY0FBSyxPQUFMLENBQWEsSUFBYixDQUFrQixLQUFsQixFQUF5QixHQUF6QixFQUE4QixJQUE5Qjs7QUFFQSxZQUFJLE9BQUosRUFBYTtBQUNYLGlCQUFPLElBQVAsQ0FBWSxPQUFaLEVBQ0csT0FESCxDQUNXLGVBQU87QUFDZCxrQkFBSyxPQUFMLENBQWEsZ0JBQWIsQ0FBOEIsR0FBOUIsRUFBbUMsUUFBUSxHQUFSLENBQW5DO0FBQ0QsV0FISDtBQUlEOztBQUVELGNBQUssT0FBTCxDQUFhLGdCQUFiLENBQThCLE1BQTlCLEVBQXNDLFlBQU07QUFDMUMsa0JBQVEsWUFBWSxLQUFLLEtBQUwsQ0FBVyxNQUFLLE9BQUwsQ0FBYSxRQUF4QixDQUFaLEdBQWdELE1BQUssT0FBTCxDQUFhLFFBQXJFO0FBQ0QsU0FGRDtBQUdBLGNBQUssT0FBTCxDQUFhLGdCQUFiLENBQThCLE9BQTlCLEVBQXVDLFlBQU07QUFDM0MsaUJBQU8sK0NBQStDLEdBQXREO0FBQ0QsU0FGRDtBQUdBLGNBQUssT0FBTCxDQUFhLElB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QU87QUFDbkIsaUJBQUssSUFBTCxDQUFVLENBQVY7QUFDRCxTQUZEO0FBR0E7QUFDRDs7QUFFRCxVQUFJLFVBQVUscUJBQVcsS0FBWCxFQUFrQixPQUFoQztBQUNBLGNBQVEsYUFBUixDQUFzQixRQUF0QixFQUFnQyxnQkFBaEMsQ0FBaUQsT0FBakQsRUFBMEQsWUFBTTtBQUM5RCxrQkFBVSxTQUFWLENBQW9CLG9CQUFwQixDQUF5QyxLQUF6QztBQUNELE9BRkQ7QUFHQSxXQUFLLE1BQUwsQ0FBWSxJQUFaLENBQWlCLEtBQWpCO0FBQ0EsV0FBSyxPQUFMLENBQWEsV0FBYixDQUF5QixPQUF6QjtBQUNBLFdBQUssY0FBTCxHQUFzQixLQUFLLE9BQUwsQ0FBYSxXQUFiLElBQTZCLEtBQUssV0FBTCxJQUFvQixPQUFPLFVBQVAsR0FBb0IsS0FBSyxXQUE3QyxDQUE3QixDQUF0QjtBQUNEOzs7d0JBRWE7QUFDWixhQUFPLEtBQUssR0FBWjtBQUNEOzs7NkNBM0IrQixFLEVBQUk7QUFDbEMsZ0JBQVUsU0FBVixDQUFvQixvQkFBcEIsR0FBMkMsRUFBM0M7QUFDRDs7OzRDQUU4QixFLEVBQUk7QUFDakMsZ0JBQVUsU0FBVixDQUFvQixtQkFBcEIsR0FBMEMsRUFBMUM7QUFDRDs7Ozs7O2tCQXdCWSxTIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsImNsYXNzIGFqYXgge1xuICBjb25zdHJ1Y3RvcigpIHtcbiAgICB0aGlzLnJlcXVlc3Q7XG4gIH1cblxuICBnZXQodXJsLCBwYXJzZUpTT04sIGhlYWRlcnMpIHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgdGhpcy5yZXF1ZXN0ID0gbmV3IFhNTEh0dHBSZXF1ZXN0KCk7XG4gICAgICB0aGlzLnJlcXVlc3Qub3BlbignR0VUJywgdXJsLCB0cnVlKTtcblxuICAgICAgaWYgKGhlYWRlcnMpIHtcbiAgICAgICAgT2JqZWN0LmtleXMoaGVhZGVycylcbiAgICAgICAgICAuZm9yRWFjaChrZXkgPT4ge1xuICAgICAgICAgICAgdGhpcy5yZXF1ZXN0LnNldFJlcXVlc3RIZWFkZXIoa2V5LCBoZWFkZXJzW2tleV0pXG4gICAgICAgICAgfSlcbiAgICAgIH1cblxuICAgICAgdGhpcy5yZXF1ZXN0LmFkZEV2ZW50TGlzdGVuZXIoJ2xvYWQnLCAoKSA9PiB7XG4gICAgICAgIHJlc29sdmUocGFyc2VKU09OID8gSlNPTi5wYXJzZSh0aGlzLnJlcXVlc3QucmVzcG9uc2UpIDogdGhpcy5yZXF1ZXN0LnJlc3BvbnNlKTtcbiAgICAgIH0pO1xuICAgICAgdGhpcy5yZXF1ZXN0LmFkZEV2ZW50TGlzdGVuZXIoJ2Vycm9yJywgKCkgPT4ge1xuICAgICAgICByZWplY3QoJ0ZhaWxlZCB0byBjb21tdW5pY2F0ZSB3aXRoIHNlcnZlciBhdCB1cmw6ICcgKyB1cmwpO1xuICAgICAgfSk7XG4gICAgICB0aGlzLnJlcXVlc3Quc2VuZCgpO1xuICAgIH0pO1xuICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IGFqYXg7XG4iLCJpbXBvcnQgdHdpdGNoIGZyb20gJy4vdHdpdGNoLmpzJztcbmltcG9ydCBzdG9yYWdlIGZyb20gJy4vc3RvcmFnZS5qcyc7XG5pbXBvcnQgc2xpZGUgZnJvbSAnLi9oZXJvLXNsaWRlLmpzJztcbmltcG9ydCB2aWRlb19yb3cgZnJvbSAnLi92aWRlby1yb3cuanMnO1xuaW1wb3J0IHtkZWZhdWx0IGFzIGJsaW5rX3JvdXRlcn0gZnJvbSAnLi9yb3V0ZXIuanMnO1xuaW1wb3J0IHtkZWZhdWx0IGFzIGJsaW5rX3BsYXllcn0gZnJvbSAnLi9wbGF5ZXIuanMnO1xuXG5jb25zdCBjbGllbnRfaWQgPSAnYm0wMm44d3h4enFtenZmYjB6bGViZDV5ZTJybjByNyc7XG5cbmxldCBhcGkgPSBuZXcgdHdpdGNoKGNsaWVudF9pZCk7XG5sZXQgZGIgPSBuZXcgc3RvcmFnZSgnYmxpbmsnKTtcbmxldCByb3V0ZXIgPSBuZXcgYmxpbmtfcm91dGVyKCk7XG5cbmxldCBPQVVUSF9UT0tFTiA9IGRiLmxvYWQoJ29hdXRoX3Rva2VuJyk7XG5cbmlmICghT0FVVEhfVE9LRU4pIHtcbiAgbGV0IGhhc2ggPSBkb2N1bWVudC5sb2NhdGlvbi5oYXNoLnN1YnN0cigxLCBkb2N1bWVudC5sb2NhdGlvbi5oYXNoLmxlbmd0aCk7XG4gIGxldCBwYWlycyA9IGhhc2guc3BsaXQoJyYnKTtcbiAgcGFpcnMuZm9yRWFjaCgocGFpcikgPT4ge1xuICAgIGxldCBrZXlzID0gcGFpci5zcGxpdCgnPScpO1xuICAgIGlmIChrZXlzWzBdID09ICdhY2Nlc3NfdG9rZW4nKSB7XG4gICAgICBPQVVUSF9UT0tFTiA9IGtleXNbMV07XG4gICAgICBkYi5zYXZlKCdvYXV0aF90b2tlbicsIE9BVVRIX1RPS0VOKTtcbiAgICAgIGRvY3VtZW50LmxvY2F0aW9uLmhhc2ggPSAnLyc7XG4gICAgfVxuICB9KTtcbn1cblxud2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ2xvYWQnLCAoZXZlbnQpID0+IHtcbiAgbGV0IHBsYXllciA9IG5ldyBibGlua19wbGF5ZXIoJ3BsYXllci13cmFwcGVyJyk7XG5cblxuICByb3V0ZXIuYWRkX3JvdXRlKFtcbiAgICB7J3ZpZGVvcyc6IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyN2aWRlb3MnKX0sXG4gICAgeydwbGF5ZXInOiBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjcGxheWVyJyl9LFxuICAgIHsnc2VhcmNoJzogZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI3NlYXJjaCcpfSxcbiAgICB7J3Byb21wdCc6IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNwcm9tcHQnKX1cbiAgXSk7XG5cbiAgaWYgKCFPQVVUSF9UT0tFTikge1xuICAgIHJvdXRlci5yb3V0ZSgncHJvbXB0Jyk7XG4gIH0gZWxzZSB7XG4gICAgcm91dGVyLnJvdXRlKCd2aWRlb3MnKTtcbiAgfVxuXG4gIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5leGl0LWJ0bicpXG4gICAgLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKGV2ZW50KSA9PiB7XG4gICAgICBwbGF5ZXIuZGVzdHJveSgpO1xuICAgICAgcm91dGVyLnJvdXRlKCd2aWRlb3MnKTtcbiAgICB9KTtcblxuICB2aWRlb19yb3cuc2V0X3ZpZGVvX2NsaWNrX2NhbGxiYWNrKCh2aWRlbykgPT4ge1xuICAgIGlmICh2aWRlby50eXBlID09ICdhcmNoaXZlJykge1xuICAgICAgcGxheWVyLmxvYWQoeyB2aWRlbzogdmlkZW8uaWQgfSk7XG4gICAgfSBlbHNlIGlmICh2aWRlby50eXBlID09ICdzdHJlYW0nKSB7XG4gICAgICBwbGF5ZXIubG9hZCh7IGNoYW5uZWw6IHZpZGVvLmNoYW5uZWwubmFtZSB9KTtcbiAgICB9XG4gICAgcm91dGVyLnJvdXRlKCdwbGF5ZXInKTtcbiAgfSk7XG5cbiAgdmlkZW9fcm93LnNldF9uYXZpZ2F0aW9uX2NhbGxiYWNrKChldmVudCkgPT4ge1xuICAgIGlmIChldmVudC5zZWN0aW9uID49IGV2ZW50LnRvdGFsX3NlY3Rpb25zIC0gMiAmJiBldmVudC5kYXRhKSB7XG4gICAgICBhcGkuZ2V0X3VzZXJfdmlkZW9zKGV2ZW50LmRhdGEudXNlcm5hbWUsIGV2ZW50LmRhdGEubGltaXQsIGV2ZW50LnZpZGVvcylcbiAgICAgICAgLnRoZW4oKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgZXZlbnQucm93LnB1c2gocmVzcG9uc2UudmlkZW9zKTtcbiAgICAgICAgfSk7XG4gICAgfVxuICB9KTtcblxuICBzbGlkZS5zZXRfd2F0Y2hfbm93X2NhbGxiYWNrKChzdHJlYW0pID0+IHtcbiAgICBwbGF5ZXIubG9hZCh7IGNoYW5uZWw6IHN0cmVhbS5uYW1lIH0pO1xuICAgIHJvdXRlci5yb3V0ZSgncGxheWVyJyk7XG4gIH0pO1xuXG4gIGFwaS5nZXRfdXNlcihPQVVUSF9UT0tFTilcbiAgICAudGhlbigodXNlcikgPT4ge1xuICAgICAgYXBpLmdldF91c2VyX3N0cmVhbV9mb2xsb3dzKE9BVVRIX1RPS0VOKVxuICAgICAgICAudGhlbigoc3RyZWFtcykgPT4ge1xuICAgICAgICAgIGxldCBpc19maXJzdCA9IHRydWU7XG4gICAgICAgICAgc3RyZWFtcy5mb3JFYWNoKChzdHJlYW0pID0+IHtcbiAgICAgICAgICAgIGxldCBzID0gbmV3IHNsaWRlKHN0cmVhbSk7XG4gICAgICAgICAgICBsZXQgZWxlbWVudCA9IHMuZWxlbWVudDtcbiAgICAgICAgICAgIGlmIChpc19maXJzdCkge1xuICAgICAgICAgICAgICBlbGVtZW50LnF1ZXJ5U2VsZWN0b3IoJy5oZXJvX19zbGlkZScpLmNsYXNzTGlzdC5hZGQoJ3Zpc2libGUnKTtcbiAgICAgICAgICAgICAgaXNfZmlyc3QgPSBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5oZXJvJykuYXBwZW5kQ2hpbGQoZWxlbWVudCk7XG4gICAgICAgICAgfSk7XG5cbiAgICAgICAgICBsZXQgcm93ID0gbmV3IHZpZGVvX3JvdygnTGl2ZScsIHN0cmVhbXMpO1xuICAgICAgICAgIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyN2aWRlb3MnKS5hcHBlbmRDaGlsZChyb3cuZWxlbWVudCk7XG5cbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH0pXG4gICAgICAgIC50aGVuKCgpID0+IHtcbiAgICAgICAgICBhcGkuZ2V0X2ZvbGxvd3MoT0FVVEhfVE9LRU4sIHVzZXIubmFtZSlcbiAgICAgICAgICAudGhlbigoY2hhbm5lbHMpID0+IHtcbiAgICAgICAgICAgIHF1ZXVlX3Jvd3MoY2hhbm5lbHMuZm9sbG93cylcbiAgICAgICAgICAgICAgLnRoZW4oKCkgPT4ge1xuXG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9KTtcblxuXG5cbiAgbGV0IGhlcm9faGlnaGxpZ2h0X3Nwb3RzID0gMTtcbiAgbGV0IGhlcm9fc3BvdGxpZ2h0cyA9IFtdO1xuXG4gIGZ1bmN0aW9uIHF1ZXVlX3Jvd3ModXNlcnMpIHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgaWYgKHVzZXJzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgZmlsbCh1c2Vyc1swXSlcbiAgICAgICAgICAudGhlbigoKSA9PiB7XG4gICAgICAgICAgICBpZiAodXNlcnMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICBxdWV1ZV9yb3dzKHVzZXJzLnNsaWNlKDEsIHVzZXJzLmxlbmd0aCkpLnRoZW4ocmVzb2x2ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXNvbHZlKCk7XG4gICAgICB9XG4gICAgfSlcbiAgfVxuXG4gIGZ1bmN0aW9uIGZpbGwodXNlciwgaXNMYXN0KSB7XG4gICAgbGV0IHJvdyA9IG5ldyB2aWRlb19yb3codXNlci5jaGFubmVsLmRpc3BsYXlfbmFtZSwgbnVsbCwgeyB1c2VybmFtZTogdXNlci5jaGFubmVsLm5hbWUsIGxpbWl0OiAxMH0pO1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICBhcGkuZ2V0X3VzZXJfdmlkZW9zKHVzZXIuY2hhbm5lbC5uYW1lLCAxMClcbiAgICAgICAgLnRoZW4oKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgaWYgKHJlc3BvbnNlLnZpZGVvcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICByb3cucHVzaChyZXNwb25zZS52aWRlb3MpO1xuICAgICAgICAgICAgZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI3ZpZGVvcycpLmFwcGVuZENoaWxkKHJvdy5lbGVtZW50KTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmVzb2x2ZSgpO1xuICAgICAgICB9KTtcbiAgICB9KVxuICB9XG59KTtcbiIsImNsYXNzIHNsaWRlIHtcbiAgY29uc3RydWN0b3Ioc3RyZWFtKSB7XG4gICAgdGhpcy5zbGlkZSA9IGRvY3VtZW50LmltcG9ydE5vZGUoZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI2hlcm8tdGVtcGxhdGUnKS5jb250ZW50LCB0cnVlKTtcblxuICAgIHRoaXMuc2xpZGUucXVlcnlTZWxlY3RvcignLnNsaWRlX19pbWFnZScpLnNyYyA9IHN0cmVhbS5jaGFubmVsLnByb2ZpbGVfYmFubmVyIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RyZWFtLmNoYW5uZWwudmlkZW9fYmFubmVyIHx8XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3RyZWFtLmNoYW5uZWwubG9nbztcbiAgICB0aGlzLnNsaWRlLnF1ZXJ5U2VsZWN0b3IoJy5zbGlkZV9fY29udGVudF9fY2hhbm5lbCcpLmlubmVyVGV4dCA9IHN0cmVhbS5jaGFubmVsLmRpc3BsYXlfbmFtZTtcbiAgICB0aGlzLnNsaWRlLnF1ZXJ5U2VsZWN0b3IoJy5zbGlkZV9fY29udGVudF9fZGVzY3JpcHRpb24nKS5pbm5lclRleHQgPSBzdHJlYW0uY2hhbm5lbC5zdGF0dXMgfHwgXCJTdHJlYW1pbmcgTGl2ZVwiO1xuICAgIHRoaXMuc2xpZGUucXVlcnlTZWxlY3RvcignLndhdGNoLW5vdy1idXR0b24nKS5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIChldmVudCkgPT4ge1xuICAgICAgc2xpZGUucHJvdG90eXBlLndhdGNoX25vd19jYWxsYmFjayh7XG4gICAgICAgIG5hbWU6IHN0cmVhbS5jaGFubmVsLm5hbWVcbiAgICAgIH0pXG4gICAgfSk7XG4gIH1cblxuICBzdGF0aWMgc2V0X3dhdGNoX25vd19jYWxsYmFjayhmbikge1xuICAgIHNsaWRlLnByb3RvdHlwZS53YXRjaF9ub3dfY2FsbGJhY2sgPSBmbjtcbiAgfVxuXG4gIGdldCBlbGVtZW50KCkge1xuICAgIHJldHVybiB0aGlzLnNsaWRlO1xuICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IHNsaWRlO1xuIiwiY2xhc3MgcGxheWVyIHtcbiAgY29uc3RydWN0b3IoaWQpIHtcbiAgICB0aGlzLmlkID0gaWQ7XG4gICAgdGhpcy5wbGF5ZXI7XG5cbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcigncmVzaXplJywgKGV2ZW50KSA9PiB7XG4gICAgICBpZiAodGhpcy5wbGF5ZXIpIHtcbiAgICAgICAgbGV0IGkgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCdpZnJhbWUnKTtcbiAgICAgICAgaS53aWR0aCA9IHdpbmRvdy5pbm5lcldpZHRoO1xuICAgICAgICBpLmhlaWdodCA9IHdpbmRvdy5pbm5lckhlaWdodDtcbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuXG4gIGxvYWQob3B0aW9ucyA9IHt2aWRlbywgY2hhbm5lbH0pIHtcbiAgICBsZXQgY29uZmlnID0ge1xuICAgICAgd2lkdGg6IHdpbmRvdy5pbm5lcldpZHRoLFxuICAgICAgaGVpZ2h0OiB3aW5kb3cuaW5uZXJIZWlnaHRcbiAgICB9O1xuICAgIGlmIChvcHRpb25zLnZpZGVvKSBjb25maWcudmlkZW8gPSBvcHRpb25zLnZpZGVvO1xuICAgIGlmIChvcHRpb25zLmNoYW5uZWwpIGNvbmZpZy5jaGFubmVsID0gb3B0aW9ucy5jaGFubmVsO1xuXG4gICAgdGhpcy5wbGF5ZXIgPSBuZXcgVHdpdGNoLlBsYXllcih0aGlzLmlkLCBjb25maWcpO1xuICB9XG5cbiAgcGxheSgpIHtcbiAgICB0aGlzLnBsYXllci5wbGF5KCk7XG4gIH1cblxuICBwYXVzZSgpIHtcbiAgICB0aGlzLnBsYXllci5wYXVzZSgpO1xuICB9XG5cbiAgZGVzdHJveSgpIHtcbiAgICB0aGlzLnBsYXllciA9ICcnO1xuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKHRoaXMuaWQpLmlubmVySFRNTCA9ICcnO1xuICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IHBsYXllcjtcbiIsImNsYXNzIHBvc3RlciB7XG4gIGNvbnN0cnVjdG9yKGdhbWUpIHtcbiAgICB0aGlzLnBvc3RlciA9IGRvY3VtZW50LmltcG9ydE5vZGUoZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI3Bvc3Rlci10ZW1wbGF0ZScpLmNvbnRlbnQsIHRydWUpO1xuXG4gICAgaWYgKCFnYW1lLnRodW1ibmFpbCkge1xuXG4gICAgfVxuXG4gICAgaWYgKGdhbWUudHlwZSA9PSAnc3RyZWFtJykge1xuICAgICAgZ2FtZS50aHVtYm5haWwgPSBnYW1lLmNoYW5uZWwucHJvZmlsZV9iYW5uZXIgfHwgZ2FtZS5jaGFubmVsLmxvZ28gfHwgJyc7XG4gICAgICBnYW1lLm5hbWUgPSBnYW1lLmNoYW5uZWwuZGlzcGxheV9uYW1lIHx8IGdhbWUuY2hhbm5lbC5uYW1lO1xuICAgIH1cblxuICAgIHRoaXMucG9zdGVyLnF1ZXJ5U2VsZWN0b3IoJy52aWRlb19faW1hZ2UnKS5zcmMgPSBnYW1lLnRodW1ibmFpbDtcbiAgICB0aGlzLnBvc3Rlci5xdWVyeVNlbGVjdG9yKCcudmlkZW9fX3RpdGxlJykuaW5uZXJUZXh0ID0gZ2FtZS5uYW1lLmxlbmd0aCA+IDE2ID8gZ2FtZS5uYW1lLnN1YnN0cigwLCAxNikgKyAnLi4uJyA6IGdhbWUubmFtZTtcbiAgfVxuXG4gIGdldCBlbGVtZW50KCkge1xuICAgIHJldHVybiB0aGlzLnBvc3RlcjtcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBwb3N0ZXI7XG4iLCJjbGFzcyByb3V0ZXIge1xuICBjb25zdHJ1Y3Rvcihyb3V0ZXMgPSB7fSkge1xuICAgIHRoaXMucm91dGVzID0gcm91dGVzO1xuICAgIHRoaXMuYWN0aXZlX3JvdXRlO1xuICB9XG5cbiAgcm91dGUobmFtZSkge1xuICAgIGlmICh0aGlzLmFjdGl2ZV9yb3V0ZSkgdGhpcy5hY3RpdmVfcm91dGUuY2xhc3NMaXN0LnJlbW92ZSgndmlzaWJsZScpO1xuICAgIHRoaXMuYWN0aXZlX3JvdXRlID0gdGhpcy5yb3V0ZXNbbmFtZV07XG4gICAgdGhpcy5yb3V0ZXNbbmFtZV0uY2xhc3NMaXN0LmFkZCgndmlzaWJsZScpO1xuICB9XG5cbiAgYWRkX3JvdXRlKHJvdXRlKSB7XG4gICAgaWYgKEFycmF5LmlzQXJyYXkocm91dGUpKSB7XG4gICAgICByb3V0ZS5mb3JFYWNoKChyKSA9PiB7XG4gICAgICAgIHRoaXMuYWRkX3JvdXRlKHIpO1xuICAgICAgfSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgbGV0IGtleXMgPSBPYmplY3Qua2V5cyhyb3V0ZSk7XG4gICAgdGhpcy5yb3V0ZXNba2V5c1swXV0gPSByb3V0ZVtrZXlzWzBdXTtcbiAgICBjb25zb2xlLmxvZyh0aGlzLnJvdXRlc1trZXlzWzBdXSk7XG4gIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgcm91dGVyO1xuIiwiY2xhc3Mgc3RvcmFnZSB7XG4gIGNvbnN0cnVjdG9yKG5hbWVzcGFjZSkge1xuICAgIHRoaXMubG9hZF9zdG9yYWdlX21hcChuYW1lc3BhY2UpO1xuICB9XG4gIHVuaXF1ZV9pZChzaXplKSB7XG4gICAgbGV0IGFscGhhYmV0ID0gJ2FiY2RlZmdoaWprbG1ub3BxcnN0dXZ3eHl6QUJDREVGR0hJSktMTU5PUFFSU1RVVldYWVoxMjM0NTY3ODkwJCYtXysnO1xuICAgIGxldCBpZCA9ICcnO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgc2l6ZTsgaSsrKSB7XG4gICAgICBpZCArPSBhbHBoYWJldFtNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiBhbHBoYWJldC5sZW5ndGgpXTtcbiAgICB9XG5cbiAgICBPYmplY3Qua2V5cyh0aGlzLnN0b3JhZ2VfbWFwKS5mb3JFYWNoKChrZXkpID0+IHtcbiAgICAgIGlmIChrZXkgPT09IGlkKSB7XG4gICAgICAgIHJldHVybiB1bmlxdWVfaWQoc2l6ZSk7XG4gICAgICB9XG4gICAgfSk7XG5cbiAgICByZXR1cm4gaWQ7XG4gIH1cbiAgc2F2ZShuYW1lLCBkYXRhKSB7XG4gICAgaWYgKCF0aGlzLnN0b3JhZ2VfbWFwW25hbWVdKSB7XG4gICAgICB0aGlzLnN0b3JhZ2VfbWFwW25hbWVdID0gdGhpcy51bmlxdWVfaWQoNSk7XG4gICAgfVxuICAgIGxldCBrZXkgPSB0aGlzLnN0b3JhZ2VfbWFwW25hbWVdO1xuICAgIHdpbmRvdy5sb2NhbFN0b3JhZ2Uuc2V0SXRlbShgc3RvcmFnZS0ke3RoaXMubmFtZXNwYWNlfS0ke2tleX1gLCAodHlwZW9mIGRhdGEgPT0gJ09iamVjdCcpID8gSlNPTi5zdHJpbmdpZnkoZGF0YSkgOiBkYXRhKTtcbiAgICB0aGlzLnNhdmVfc3RvcmFnZV9tYXAoKTtcbiAgfVxuICBsb2FkKG5hbWUpIHtcbiAgICByZXR1cm4gd2luZG93LmxvY2FsU3RvcmFnZS5nZXRJdGVtKGBzdG9yYWdlLSR7dGhpcy5uYW1lc3BhY2V9LSR7dGhpcy5zdG9yYWdlX21hcFtuYW1lXX1gKSB8fCBmYWxzZTtcbiAgfVxuICBkZWxldGUobmFtZSkge1xuICAgIHdpbmRvdy5sb2NhbFN0b3JhZ2UucmVtb3ZlSXRlbShgc3RvcmFnZS0ke3RoaXMubmFtZXNwYWNlfS0ke3RoaXMuc3RvcmFnZV9tYXBbbmFtZV19YCk7XG4gIH1cbiAgc2F2ZV9zdG9yYWdlX21hcCgpIHtcbiAgICB3aW5kb3cubG9jYWxTdG9yYWdlLnNldEl0ZW0oYHN0b3JhZ2UtJHt0aGlzLm5hbWVzcGFjZX1gLCBKU09OLnN0cmluZ2lmeSh0aGlzLnN0b3JhZ2VfbWFwKSk7XG4gIH1cbiAgbG9hZF9zdG9yYWdlX21hcChuYW1lc3BhY2UpIHtcbiAgICB0aGlzLm5hbWVzcGFjZSA9IG5hbWVzcGFjZTtcbiAgICB0aGlzLnN0b3JhZ2VfbWFwID0gSlNPTi5wYXJzZSh3aW5kb3cubG9jYWxTdG9yYWdlLmdldEl0ZW0oYHN0b3JhZ2UtJHt0aGlzLm5hbWVzcGFjZX1gKSB8fCAne30nKTtcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBzdG9yYWdlO1xuIiwiaW1wb3J0IGFqYXggZnJvbSAnLi9hamF4LmpzJztcblxubGV0IGh0dHAgPSBuZXcgYWpheCgpO1xuXG5jbGFzcyB0d2l0Y2gge1xuICBjb25zdHJ1Y3RvcihjbGllbnRfaWQpIHtcbiAgICBpZiAoIWNsaWVudF9pZCkgdGhyb3cgbmV3IEVycm9yKCdUd2l0Y2ggQVBJIHJlcXVpcmVzIGBjbGllbnRfaWRgIHRvIGJlIHNldCcpO1xuXG4gICAgdGhpcy5iYXNlX3VybCA9ICdodHRwczovL2FwaS50d2l0Y2gudHYva3Jha2VuJztcbiAgICB0aGlzLmNsaWVudF9pZCA9IGNsaWVudF9pZDtcbiAgfVxuXG4gIGdldF91c2VyKHRva2VuKSB7XG4gICAgbGV0IHVybCA9IGAke3RoaXMuYmFzZV91cmx9L3VzZXI/b2F1dGhfdG9rZW49JHt0b2tlbn1gO1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICBodHRwLmdldCh1cmwsIHRydWUsIHsgJ0NsaWVudC1JRCc6IHRoaXMuY2xpZW50X2lkIH0pXG4gICAgICAgIC50aGVuKChfZGF0YSkgPT4ge1xuICAgICAgICAgIHJlc29sdmUoX2RhdGEpO1xuICAgICAgICB9KVxuICAgICAgICAuY2F0Y2goY29uc29sZS5lcnJvcik7XG4gICAgfSk7XG4gIH1cblxuICBnZXRfZm9sbG93cyh0b2tlbiwgdXNlcikge1xuICAgIGxldCB1cmwgPSBgJHt0aGlzLmJhc2VfdXJsfS91c2Vycy8ke3VzZXJ9L2ZvbGxvd3MvY2hhbm5lbHM/b2F1dGhfdG9rZW49JHt0b2tlbn0mbGltaXQ9MTAwYDtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgaHR0cC5nZXQodXJsLCB0cnVlLCB7ICdDbGllbnQtSUQnOiB0aGlzLmNsaWVudF9pZCB9KVxuICAgICAgICAudGhlbigoX2RhdGEpID0+IHtcbiAgICAgICAgICBfZGF0YS5mb2xsb3dzLnNvcnQoKGEsIGIpID0+IHtcbiAgICAgICAgICAgIGlmIChhLmNoYW5uZWwuZGlzcGxheV9uYW1lLnRvTG93ZXJDYXNlKCkgPCBiLmNoYW5uZWwuZGlzcGxheV9uYW1lLnRvTG93ZXJDYXNlKCkpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIC0xO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChhLmNoYW5uZWwuZGlzcGxheV9uYW1lLnRvTG93ZXJDYXNlKCkgPiBiLmNoYW5uZWwuZGlzcGxheV9uYW1lLnRvTG93ZXJDYXNlKCkpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIDE7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICByZXR1cm4gMDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcblxuICAgICAgICAgIHJlc29sdmUoX2RhdGEpO1xuICAgICAgICB9KVxuICAgICAgICAuY2F0Y2goY29uc29sZS5lcnJvcik7XG4gICAgfSk7XG5cbiAgfVxuXG4gIGdldF90b3BfZ2FtZXMobGltaXQgPSAxNSwgb2Zmc2V0ID0gMCkge1xuICAgIGxldCB1cmwgPSBgJHt0aGlzLmJhc2VfdXJsfS9nYW1lcy90b3A/bGltaXQ9JHtsaW1pdH0mb2Zmc2V0PSR7b2Zmc2V0fWA7XG4gICAgbGV0IGRhdGEgPSB7fTtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgaHR0cC5nZXQodXJsLCB0cnVlLCB7ICdDbGllbnQtSUQnOiB0aGlzLmNsaWVudF9pZCB9KVxuICAgICAgICAudGhlbigoX2RhdGEpID0+IHtcbiAgICAgICAgICBkYXRhLm5leHQgPSBfZGF0YS5fbGlua3MubmV4dDtcbiAgICAgICAgICBkYXRhLmdhbWVzID0gW107XG5cbiAgICAgICAgICBfZGF0YS50b3AuZm9yRWFjaCgoaXRlbSkgPT4ge1xuICAgICAgICAgICAgbGV0IGdhbWUgPSB7fTtcbiAgICAgICAgICAgIGdhbWUudmlld2VycyA9IGl0ZW0udmlld2VycztcbiAgICAgICAgICAgIGdhbWUuY2hhbm5lbHMgPSBpdGVtLmNoYW5uZWxzO1xuICAgICAgICAgICAgZ2FtZS5uYW1lID0gaXRlbS5nYW1lLm5hbWU7XG4gICAgICAgICAgICBnYW1lLnBvc3RlcnMgPSB7XG4gICAgICAgICAgICAgIGxhcmdlOiBpdGVtLmdhbWUuYm94LmxhcmdlLFxuICAgICAgICAgICAgICBtZWRpdW06IGl0ZW0uZ2FtZS5ib3gubWVkaXVtLFxuICAgICAgICAgICAgICBzbWFsbDogaXRlbS5nYW1lLmJveC5zbWFsbFxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZ2FtZS50aHVtYm5haWwgPSBpdGVtLmdhbWUuYm94Lm1lZGl1bTtcblxuICAgICAgICAgICAgZGF0YS5nYW1lcy5wdXNoKGdhbWUpO1xuICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgcmVzb2x2ZShkYXRhKTtcbiAgICAgICAgfSlcbiAgICAgICAgLmNhdGNoKGNvbnNvbGUuZXJyb3IpO1xuICAgIH0pO1xuICB9XG5cbiAgZ2V0X3RvcF92aWRlb3MobGltaXQgPSAxNSwgb2Zmc2V0ID0gMCwgZ2FtZSwgcGVyaW9kKSB7XG4gICAgbGV0IHVybCA9IGAke3RoaXMuYmFzZV91cmx9L3ZpZGVvcy90b3A/bGltaXQ9JHtsaW1pdH0mb2Zmc2V0PSR7b2Zmc2V0fSR7Z2FtZSA/ICcmZ2FtZT0nICsgZ2FtZSA6ICcnfSR7cGVyaW9kID8gJyZwZXJpb2Q9JyArIHBlcmlvZCA6ICcnfWA7XG4gICAgbGV0IGRhdGEgPSB7fTtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgaHR0cC5nZXQodXJsLCB0cnVlLCB7ICdDbGllbnQtSUQnOiB0aGlzLmNsaWVudF9pZCB9KVxuICAgICAgICAudGhlbigoX2RhdGEpID0+IHtcbiAgICAgICAgICBkYXRhLm5leHQgPSBfZGF0YS5fbGlua3MubmV4dDtcbiAgICAgICAgICBkYXRhLnZpZGVvcyA9IFtdO1xuXG4gICAgICAgICAgX2RhdGEudmlkZW9zLmZvckVhY2goKGl0ZW0pID0+IHtcbiAgICAgICAgICAgIGxldCB2aWRlbyA9IHt9O1xuICAgICAgICAgICAgdmlkZW8ubmFtZSA9IGl0ZW0udGl0bGU7XG4gICAgICAgICAgICB2aWRlby5kZXNjcmlwdGlvbiA9IGl0ZW0uZGVzY3JpcHRpb247XG4gICAgICAgICAgICB2aWRlby5icm9hZGNhc3RfaWQgPSBpdGVtLmJyb2FkY2FzdF9pZDtcbiAgICAgICAgICAgIHZpZGVvLmlkID0gaXRlbS5faWQ7XG4gICAgICAgICAgICB2aWRlby50eXBlID0gaXRlbS5icm9hZGNhc3RfdHlwZTtcbiAgICAgICAgICAgIHZpZGVvLnZpZXdzID0gaXRlbS52aWV3cztcbiAgICAgICAgICAgIHZpZGVvLmNyZWF0ZWRfYXQgPSBpdGVtLmNyZWF0ZWRfYXQ7XG4gICAgICAgICAgICB2aWRlby5nYW1lID0gaXRlbS5nYW1lO1xuICAgICAgICAgICAgdmlkZW8uY2hhbm5lbCA9IGl0ZW0uY2hhbm5lbC5uYW1lO1xuICAgICAgICAgICAgdmlkZW8uY2hhbm5lbF9kaXNwbGF5X25hbWUgPSBpdGVtLmNoYW5uZWwuZGlzcGxheV9uYW1lO1xuICAgICAgICAgICAgdmlkZW8udGh1bWJuYWlsID0gaXRlbS50aHVtYm5haWxzWzBdLnVybDtcblxuICAgICAgICAgICAgZGF0YS52aWRlb3MucHVzaCh2aWRlbyk7XG4gICAgICAgICAgfSk7XG5cbiAgICAgICAgICByZXNvbHZlKGRhdGEpO1xuICAgICAgICB9KVxuICAgICAgICAuY2F0Y2goY29uc29sZS5lcnJvcik7XG4gICAgfSk7XG4gIH1cblxuICBnZXRfdXNlcl92aWRlb3MoY2hhbm5lbCwgbGltaXQgPSAxNSwgb2Zmc2V0ID0gMCwgYnJvYWRjYXN0cyA9IHRydWUsIGhsc19vbmx5KSB7XG4gICAgbGV0IHVybCA9IGAke3RoaXMuYmFzZV91cmx9L2NoYW5uZWxzLyR7Y2hhbm5lbH0vdmlkZW9zP2xpbWl0PSR7bGltaXR9Jm9mZnNldD0ke29mZnNldH0ke2Jyb2FkY2FzdHMgPyAnJmJyb2FkY2FzdHM9dHJ1ZScgOiAnJ30ke2hsc19vbmx5ID8gJyZobHM9dHJ1ZScgOiAnJ31gO1xuICAgIGxldCBkYXRhID0ge307XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgIGh0dHAuZ2V0KHVybCwgdHJ1ZSwgeyAnQ2xpZW50LUlEJzogdGhpcy5jbGllbnRfaWQgfSlcbiAgICAgICAgLnRoZW4oKF9kYXRhKSA9PiB7XG4gICAgICAgICAgZGF0YS5uZXh0ID0gX2RhdGEuX2xpbmtzLm5leHQ7XG4gICAgICAgICAgZGF0YS52aWRlb3MgPSBbXTtcblxuICAgICAgICAgIF9kYXRhLnZpZGVvcy5mb3JFYWNoKChpdGVtKSA9PiB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZyhpdGVtKVxuICAgICAgICAgICAgbGV0IHZpZGVvID0ge307XG4gICAgICAgICAgICB2aWRlby5uYW1lID0gaXRlbS50aXRsZTtcbiAgICAgICAgICAgIHZpZGVvLmRlc2NyaXB0aW9uID0gaXRlbS5kZXNjcmlwdGlvbjtcbiAgICAgICAgICAgIHZpZGVvLmJyb2FkY2FzdF9pZCA9IGl0ZW0uYnJvYWRjYXN0X2lkO1xuICAgICAgICAgICAgdmlkZW8uaWQgPSBpdGVtLl9pZDtcbiAgICAgICAgICAgIHZpZGVvLnR5cGUgPSBpdGVtLmJyb2FkY2FzdF90eXBlO1xuICAgICAgICAgICAgdmlkZW8udmlld3MgPSBpdGVtLnZpZXdzO1xuICAgICAgICAgICAgdmlkZW8uY3JlYXRlZF9hdCA9IGl0ZW0uY3JlYXRlZF9hdDtcbiAgICAgICAgICAgIHZpZGVvLmdhbWUgPSBpdGVtLmdhbWU7XG4gICAgICAgICAgICB2aWRlby5jaGFubmVsID0gaXRlbS5jaGFubmVsLm5hbWU7XG4gICAgICAgICAgICB2aWRlby5jaGFubmVsX2Rpc3BsYXlfbmFtZSA9IGl0ZW0uY2hhbm5lbC5kaXNwbGF5X25hbWU7XG5cbiAgICAgICAgICAgIGlmICghaXRlbS50aHVtYm5haWxzWzBdKSB7XG4gICAgICAgICAgICAgIHZpZGVvLnRodW1ibmFpbCA9ICdodHRwOi8vbG9jYWxob3N0OjMwMDAvYXNzZXRzL2ltZy9wbGFjZWhvbGRlci5qcGcnO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgdmlkZW8udGh1bWJuYWlsID0gaXRlbS50aHVtYm5haWxzWzBdLnVybDtcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgZGF0YS52aWRlb3MucHVzaCh2aWRlbyk7XG4gICAgICAgICAgfSk7XG5cbiAgICAgICAgICByZXNvbHZlKGRhdGEpO1xuICAgICAgICB9KVxuICAgICAgICAuY2F0Y2goY29uc29sZS5lcnJvcik7XG4gICAgfSk7XG4gIH1cblxuICBnZXRfc3RyZWFtKGNoYW5uZWwpIHtcbiAgICBsZXQgdXJsID0gYCR7dGhpcy5iYXNlX3VybH0vc3RyZWFtcy8ke2NoYW5uZWx9YDtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgaHR0cC5nZXQodXJsLCB0cnVlLCB7ICdDbGllbnQtSUQnOiB0aGlzLmNsaWVudF9pZCB9KVxuICAgICAgICAudGhlbigoX2RhdGEpID0+IHtcbiAgICAgICAgICByZXNvbHZlKF9kYXRhKTtcbiAgICAgICAgfSk7XG4gICAgfSlcbiAgICAuY2F0Y2goY29uc29sZS5lcnJvcik7XG4gIH1cblxuICBnZXRfdXNlcl92aWRlb19mb2xsb3dzKHRva2VuKSB7XG4gICAgbGV0IHVybCA9IGAke3RoaXMuYmFzZV91cmx9L3ZpZGVvcy9mb2xsb3dlZD9vYXV0aF90b2tlbj0ke3Rva2VufSZsaW1pdD0xMDBgO1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICBodHRwLmdldCh1cmwsIHRydWUsIHsgJ0NsaWVudC1JRCc6IHRoaXMuY2xpZW50X2lkIH0pXG4gICAgICAgIC50aGVuKChfZGF0YSkgPT4ge1xuICAgICAgICAgIHJlc29sdmUoX2RhdGEuc3RyZWFtcyk7XG4gICAgICAgIH0pXG4gICAgICAgIC5jYXRjaChjb25zb2xlLmVycm9yKTtcbiAgICB9KTtcbiAgfVxuXG4gIGdldF91c2VyX3N0cmVhbV9mb2xsb3dzKHRva2VuKSB7XG4gICAgbGV0IHVybCA9IGAke3RoaXMuYmFzZV91cmx9L3N0cmVhbXMvZm9sbG93ZWQ/b2F1dGhfdG9rZW49JHt0b2tlbn0mbGltaXQ9MTAwYDtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgaHR0cC5nZXQodXJsLCB0cnVlLCB7ICdDbGllbnQtSUQnOiB0aGlzLmNsaWVudF9pZCB9KVxuICAgICAgICAudGhlbigoX2RhdGEpID0+IHtcbiAgICAgICAgICByZXNvbHZlKF9kYXRhLnN0cmVhbXMubWFwKChzdHJlYW0pID0+IHtcbiAgICAgICAgICAgIHN0cmVhbS50eXBlID0gJ3N0cmVhbSc7XG4gICAgICAgICAgICByZXR1cm4gc3RyZWFtO1xuICAgICAgICAgIH0pKTtcbiAgICAgICAgfSlcbiAgICAgICAgLmNhdGNoKGNvbnNvbGUuZXJyb3IpO1xuICAgIH0pO1xuICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IHR3aXRjaDtcbiIsImltcG9ydCBwb3N0ZXIgZnJvbSAnLi9wb3N0ZXIuanMnO1xuXG5jbGFzcyB2aWRlb19yb3cge1xuICBjb25zdHJ1Y3RvcihuYW1lLCBpbml0aWFsX3ZpZGVvcywgZGF0YSkge1xuICAgIHRoaXMudmlkZW9zID0gW107XG4gICAgdGhpcy5kYXRhID0gZGF0YSB8fCBmYWxzZTtcbiAgICB0aGlzLnJvdyA9IGRvY3VtZW50LmltcG9ydE5vZGUoZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI3Jvdy10ZW1wbGF0ZScpLmNvbnRlbnQsIHRydWUpO1xuICAgIHRoaXMucm93LnF1ZXJ5U2VsZWN0b3IoJy50aXRsZScpLmlubmVyVGV4dCA9IG5hbWU7XG4gICAgdGhpcy53cmFwcGVyID0gdGhpcy5yb3cucXVlcnlTZWxlY3RvcignLnZpZGVvcycpO1xuXG4gICAgdGhpcy5zZWN0aW9uID0gMDtcbiAgICB0aGlzLnZpZGVvX3dpZHRoID0gMzE1O1xuICAgIHRoaXMudG90YWxfc2VjdGlvbnMgPSAwO1xuICAgIHRoaXMudmlkZW9zX21hc2sgPSB0aGlzLnJvdy5xdWVyeVNlbGVjdG9yKCcudmlkZW9zX19tYXNrJyk7XG4gICAgdGhpcy5jb250cm9sX2xlZnQgPSB0aGlzLnJvdy5xdWVyeVNlbGVjdG9yKCcucm93LWNvbnRyb2wtLWxlZnQnKTtcbiAgICB0aGlzLmNvbnRyb2xfcmlnaHQgPSB0aGlzLnJvdy5xdWVyeVNlbGVjdG9yKCcucm93LWNvbnRyb2wtLXJpZ2h0Jyk7XG5cbiAgICB0aGlzLmNvbnRyb2xfbGVmdC5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIChldmVudCkgPT4ge1xuICAgICAgaWYgKHRoaXMuc2VjdGlvbiA+IDApIHtcbiAgICAgICAgdGhpcy5zZWN0aW9uLS07XG4gICAgICAgIHRoaXMudmlkZW9zX21hc2suc3R5bGUudHJhbnNmb3JtID0gJ3RyYW5zbGF0ZTNkKCcgKyAoKHRoaXMudmlkZW9fd2lkdGggKiAod2luZG93LmlubmVyV2lkdGggLyB0aGlzLnZpZGVvX3dpZHRoKSkgKiAtdGhpcy5zZWN0aW9uKSArICdweCwgMCwgMCknO1xuICAgICAgfVxuICAgICAgdmlkZW9fcm93LnByb3RvdHlwZS5uYXZpZ2F0aW9uX2NhbGxiYWNrKHsgZGlyZWN0aW9uOiAnbGVmdCcgLCBzZWN0aW9uOiB0aGlzLnNlY3Rpb24sIHRvdGFsX3NlY3Rpb25zOiB0aGlzLnRvdGFsX3NlY3Rpb25zLCByb3c6IHRoaXMsIGRhdGE6IHRoaXMuZGF0YSwgdmlkZW9zOiB0aGlzLnZpZGVvcy5sZW5ndGh9KTtcbiAgICB9KTtcbiAgICB0aGlzLmNvbnRyb2xfcmlnaHQuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoZXZlbnQpID0+IHtcbiAgICAgIGlmICghKCh3aW5kb3cuaW5uZXJXaWR0aCAqIC43KSAqICh0aGlzLnNlY3Rpb24gKyAxKSA+IHRoaXMud3JhcHBlci5vZmZzZXRXaWR0aCkpIHtcbiAgICAgICAgdGhpcy5zZWN0aW9uKys7XG4gICAgICAgIHRoaXMudmlkZW9zX21hc2suc3R5bGUudHJhbnNmb3JtID0gJ3RyYW5zbGF0ZTNkKCcgKyAoKHRoaXMudmlkZW9fd2lkdGggKiAod2luZG93LmlubmVyV2lkdGggLyB0aGlzLnZpZGVvX3dpZHRoKSkgKiAtdGhpcy5zZWN0aW9uKSArICdweCwgMCwgMCknO1xuICAgICAgfVxuICAgICAgdmlkZW9fcm93LnByb3RvdHlwZS5uYXZpZ2F0aW9uX2NhbGxiYWNrKHsgZGlyZWN0aW9uOiAncmlnaHQnICwgc2VjdGlvbjogdGhpcy5zZWN0aW9uLCB0b3RhbF9zZWN0aW9uczogdGhpcy50b3RhbF9zZWN0aW9ucywgcm93OiB0aGlzLCBkYXRhOiB0aGlzLmRhdGEsIHZpZGVvczogdGhpcy52aWRlb3MubGVuZ3RofSk7XG4gICAgfSk7XG5cbiAgICBpZiAoaW5pdGlhbF92aWRlb3MpIHtcbiAgICAgIHRoaXMucHVzaChpbml0aWFsX3ZpZGVvcyk7XG4gICAgfVxuICB9XG5cbiAgc3RhdGljIHNldF92aWRlb19jbGlja19jYWxsYmFjayhmbikge1xuICAgIHZpZGVvX3Jvdy5wcm90b3R5cGUudmlkZW9fY2xpY2tfY2FsbGJhY2sgPSBmbjtcbiAgfVxuXG4gIHN0YXRpYyBzZXRfbmF2aWdhdGlvbl9jYWxsYmFjayhmbikge1xuICAgIHZpZGVvX3Jvdy5wcm90b3R5cGUubmF2aWdhdGlvbl9jYWxsYmFjayA9IGZuO1xuICB9XG5cbiAgcHVzaCh2aWRlbykge1xuICAgIGlmIChBcnJheS5pc0FycmF5KHZpZGVvKSkge1xuICAgICAgdmlkZW8uZm9yRWFjaCgodikgPT4ge1xuICAgICAgICB0aGlzLnB1c2godik7XG4gICAgICB9KTtcbiAgICAgIHJldHVybjtcbiAgICB9XG4gICAgXG4gICAgbGV0IGVsZW1lbnQgPSBuZXcgcG9zdGVyKHZpZGVvKS5lbGVtZW50O1xuICAgIGVsZW1lbnQucXVlcnlTZWxlY3RvcignLnZpZGVvJykuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoKSA9PiB7XG4gICAgICB2aWRlb19yb3cucHJvdG90eXBlLnZpZGVvX2NsaWNrX2NhbGxiYWNrKHZpZGVvKTtcbiAgICB9KTtcbiAgICB0aGlzLnZpZGVvcy5wdXNoKHZpZGVvKTtcbiAgICB0aGlzLndyYXBwZXIuYXBwZW5kQ2hpbGQoZWxlbWVudCk7XG4gICAgdGhpcy50b3RhbF9zZWN0aW9ucyA9IHRoaXMud3JhcHBlci5vZmZzZXRXaWR0aCAvICgodGhpcy52aWRlb193aWR0aCAqICh3aW5kb3cuaW5uZXJXaWR0aCAvIHRoaXMudmlkZW9fd2lkdGgpKSk7XG4gIH1cblxuICBnZXQgZWxlbWVudCgpIHtcbiAgICByZXR1cm4gdGhpcy5yb3c7XG4gIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgdmlkZW9fcm93O1xuIl19
