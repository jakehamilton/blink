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
    value: function get(url, parseJSON) {
      var _this = this;

      return new Promise(function (resolve, reject) {
        _this.request = new XMLHttpRequest();
        _this.request.open('GET', url, true);
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

var api = new _twitch2.default();
var db = new _storage2.default('blink');
var router = new _router2.default();

var client_id = 'bm02n8wxxzqmzvfb0zlebd5ye2rn0r7';
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

  // api.get_user_videos('cirno_tv', 16)
  //   .then((response) => {
  //     let row = new video_row('Cirno TV', response.videos, { username: 'cirno_tv', limit: 8 });
  //     document.getElementById('videos').appendChild(row.element);
  //
  //     document.querySelector('.slide__image').src = response.videos[0].thumbnail;
  //
  //     api.get_user_videos('trumpsc', 16)
  //     .then((response) => {
  //       let row = new video_row('Trump', response.videos, { username: 'trumpsc', limit: 8 });
  //       document.getElementById('videos').appendChild(row.element);
  //     });
  //   });
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
      var options = arguments.length <= 0 || arguments[0] === undefined ? { video: video, channel: channel } : arguments[0];

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
    var routes = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

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
  function twitch() {
    _classCallCheck(this, twitch);

    this.base_url = 'https://api.twitch.tv/kraken';
  }

  _createClass(twitch, [{
    key: 'get_user',
    value: function get_user(token) {
      var url = this.base_url + '/user?oauth_token=' + token;
      return new Promise(function (resolve, reject) {
        http.get(url, true).then(function (_data) {
          resolve(_data);
        }).catch(console.error);
      });
    }
  }, {
    key: 'get_follows',
    value: function get_follows(token, user) {
      var url = this.base_url + '/users/' + user + '/follows/channels?oauth_token=' + token + '&limit=100';
      return new Promise(function (resolve, reject) {
        http.get(url, true).then(function (_data) {
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
      var limit = arguments.length <= 0 || arguments[0] === undefined ? 15 : arguments[0];
      var offset = arguments.length <= 1 || arguments[1] === undefined ? 0 : arguments[1];

      var url = this.base_url + '/games/top?limit=' + limit + '&offset=' + offset;
      var data = {};
      return new Promise(function (resolve, reject) {
        http.get(url, true).then(function (_data) {
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
      var limit = arguments.length <= 0 || arguments[0] === undefined ? 15 : arguments[0];
      var offset = arguments.length <= 1 || arguments[1] === undefined ? 0 : arguments[1];
      var game = arguments[2];
      var period = arguments[3];

      var url = this.base_url + '/videos/top?limit=' + limit + '&offset=' + offset + (game ? '&game=' + game : '') + (period ? '&period=' + period : '');
      var data = {};
      return new Promise(function (resolve, reject) {
        http.get(url, true).then(function (_data) {
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
      var limit = arguments.length <= 1 || arguments[1] === undefined ? 15 : arguments[1];
      var offset = arguments.length <= 2 || arguments[2] === undefined ? 0 : arguments[2];
      var broadcasts = arguments.length <= 3 || arguments[3] === undefined ? true : arguments[3];
      var hls_only = arguments[4];

      var url = this.base_url + '/channels/' + channel + '/videos?limit=' + limit + '&offset=' + offset + (broadcasts ? '&broadcasts=true' : '') + (hls_only ? '&hls=true' : '');
      var data = {};
      return new Promise(function (resolve, reject) {
        http.get(url, true).then(function (_data) {
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
    key: 'get_stream',
    value: function get_stream(channel) {
      var url = this.base_url + '/streams/' + channel;
      return new Promise(function (resolve, reject) {
        http.get(url, true).then(function (_data) {
          resolve(_data);
        });
      }).catch(console.error);
    }
  }, {
    key: 'get_user_video_follows',
    value: function get_user_video_follows(token) {
      var url = this.base_url + '/videos/followed?oauth_token=' + token + '&limit=100';
      return new Promise(function (resolve, reject) {
        http.get(url, true).then(function (_data) {
          resolve(_data.streams);
        }).catch(console.error);
      });
    }
  }, {
    key: 'get_user_stream_follows',
    value: function get_user_stream_follows(token) {
      var url = this.base_url + '/streams/followed?oauth_token=' + token + '&limit=100';
      return new Promise(function (resolve, reject) {
        http.get(url, true).then(function (_data) {
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvanMvYWpheC5qcyIsInNyYy9qcy9hcHAuanMiLCJzcmMvanMvaGVyby1zbGlkZS5qcyIsInNyYy9qcy9wbGF5ZXIuanMiLCJzcmMvanMvcG9zdGVyLmpzIiwic3JjL2pzL3JvdXRlci5qcyIsInNyYy9qcy9zdG9yYWdlLmpzIiwic3JjL2pzL3R3aXRjaC5qcyIsInNyYy9qcy92aWRlby1yb3cuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7Ozs7Ozs7Ozs7O0lDQU07QUFDSixXQURJLElBQ0osR0FBYzswQkFEVixNQUNVOztBQUNaLFNBQUssT0FBTCxDQURZO0dBQWQ7O2VBREk7O3dCQUtBLEtBQUssV0FBVzs7O0FBQ2xCLGFBQU8sSUFBSSxPQUFKLENBQVksVUFBQyxPQUFELEVBQVUsTUFBVixFQUFxQjtBQUN0QyxjQUFLLE9BQUwsR0FBZSxJQUFJLGNBQUosRUFBZixDQURzQztBQUV0QyxjQUFLLE9BQUwsQ0FBYSxJQUFiLENBQWtCLEtBQWxCLEVBQXlCLEdBQXpCLEVBQThCLElBQTlCLEVBRnNDO0FBR3RDLGNBQUssT0FBTCxDQUFhLGdCQUFiLENBQThCLE1BQTlCLEVBQXNDLFlBQU07QUFDMUMsa0JBQVEsWUFBWSxLQUFLLEtBQUwsQ0FBVyxNQUFLLE9BQUwsQ0FBYSxRQUFiLENBQXZCLEdBQWdELE1BQUssT0FBTCxDQUFhLFFBQWIsQ0FBeEQsQ0FEMEM7U0FBTixDQUF0QyxDQUhzQztBQU10QyxjQUFLLE9BQUwsQ0FBYSxnQkFBYixDQUE4QixPQUE5QixFQUF1QyxZQUFNO0FBQzNDLGlCQUFPLCtDQUErQyxHQUEvQyxDQUFQLENBRDJDO1NBQU4sQ0FBdkMsQ0FOc0M7QUFTdEMsY0FBSyxPQUFMLENBQWEsSUFBYixHQVRzQztPQUFyQixDQUFuQixDQURrQjs7OztTQUxoQjs7O2tCQW9CUzs7Ozs7QUNwQmY7Ozs7QUFDQTs7OztBQUNBOzs7O0FBQ0E7Ozs7QUFD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LElBQW9CLE9BQU8sVUFBUCxHQUFvQixLQUFLLFdBQUwsQ0FBeEMsQ0FBN0IsQ0FkWjs7Ozt3QkFpQkU7QUFDWixhQUFPLEtBQUssR0FBTCxDQURLOzs7OzZDQXpCa0IsSUFBSTtBQUNsQyxnQkFBVSxTQUFWLENBQW9CLG9CQUFwQixHQUEyQyxFQUEzQyxDQURrQzs7Ozs0Q0FJTCxJQUFJO0FBQ2pDLGdCQUFVLFNBQVYsQ0FBb0IsbUJBQXBCLEdBQTBDLEVBQTFDLENBRGlDOzs7O1NBdkMvQjs7O2tCQWlFUyIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJjbGFzcyBhamF4IHtcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgdGhpcy5yZXF1ZXN0O1xuICB9XG5cbiAgZ2V0KHVybCwgcGFyc2VKU09OKSB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgIHRoaXMucmVxdWVzdCA9IG5ldyBYTUxIdHRwUmVxdWVzdCgpO1xuICAgICAgdGhpcy5yZXF1ZXN0Lm9wZW4oJ0dFVCcsIHVybCwgdHJ1ZSk7XG4gICAgICB0aGlzLnJlcXVlc3QuYWRkRXZlbnRMaXN0ZW5lcignbG9hZCcsICgpID0+IHtcbiAgICAgICAgcmVzb2x2ZShwYXJzZUpTT04gPyBKU09OLnBhcnNlKHRoaXMucmVxdWVzdC5yZXNwb25zZSkgOiB0aGlzLnJlcXVlc3QucmVzcG9uc2UpO1xuICAgICAgfSk7XG4gICAgICB0aGlzLnJlcXVlc3QuYWRkRXZlbnRMaXN0ZW5lcignZXJyb3InLCAoKSA9PiB7XG4gICAgICAgIHJlamVjdCgnRmFpbGVkIHRvIGNvbW11bmljYXRlIHdpdGggc2VydmVyIGF0IHVybDogJyArIHVybCk7XG4gICAgICB9KTtcbiAgICAgIHRoaXMucmVxdWVzdC5zZW5kKCk7XG4gICAgfSk7XG4gIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgYWpheDtcbiIsImltcG9ydCB0d2l0Y2ggZnJvbSAnLi90d2l0Y2guanMnO1xuaW1wb3J0IHN0b3JhZ2UgZnJvbSAnLi9zdG9yYWdlLmpzJztcbmltcG9ydCBzbGlkZSBmcm9tICcuL2hlcm8tc2xpZGUuanMnO1xuaW1wb3J0IHZpZGVvX3JvdyBmcm9tICcuL3ZpZGVvLXJvdy5qcyc7XG5pbXBvcnQge2RlZmF1bHQgYXMgYmxpbmtfcm91dGVyfSBmcm9tICcuL3JvdXRlci5qcyc7XG5pbXBvcnQge2RlZmF1bHQgYXMgYmxpbmtfcGxheWVyfSBmcm9tICcuL3BsYXllci5qcyc7XG5cbmxldCBhcGkgPSBuZXcgdHdpdGNoKCk7XG5sZXQgZGIgPSBuZXcgc3RvcmFnZSgnYmxpbmsnKTtcbmxldCByb3V0ZXIgPSBuZXcgYmxpbmtfcm91dGVyKCk7XG5cbmNvbnN0IGNsaWVudF9pZCA9ICdibTAybjh3eHh6cW16dmZiMHpsZWJkNXllMnJuMHI3JztcbmxldCBPQVVUSF9UT0tFTiA9IGRiLmxvYWQoJ29hdXRoX3Rva2VuJyk7XG5cbmlmICghT0FVVEhfVE9LRU4pIHtcbiAgbGV0IGhhc2ggPSBkb2N1bWVudC5sb2NhdGlvbi5oYXNoLnN1YnN0cigxLCBkb2N1bWVudC5sb2NhdGlvbi5oYXNoLmxlbmd0aCk7XG4gIGxldCBwYWlycyA9IGhhc2guc3BsaXQoJyYnKTtcbiAgcGFpcnMuZm9yRWFjaCgocGFpcikgPT4ge1xuICAgIGxldCBrZXlzID0gcGFpci5zcGxpdCgnPScpO1xuICAgIGlmIChrZXlzWzBdID09ICdhY2Nlc3NfdG9rZW4nKSB7XG4gICAgICBPQVVUSF9UT0tFTiA9IGtleXNbMV07XG4gICAgICBkYi5zYXZlKCdvYXV0aF90b2tlbicsIE9BVVRIX1RPS0VOKTtcbiAgICAgIGRvY3VtZW50LmxvY2F0aW9uLmhhc2ggPSAnLyc7XG4gICAgfVxuICB9KTtcbn1cblxud2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ2xvYWQnLCAoZXZlbnQpID0+IHtcbiAgbGV0IHBsYXllciA9IG5ldyBibGlua19wbGF5ZXIoJ3BsYXllci13cmFwcGVyJyk7XG5cblxuICByb3V0ZXIuYWRkX3JvdXRlKFtcbiAgICB7J3ZpZGVvcyc6IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyN2aWRlb3MnKX0sXG4gICAgeydwbGF5ZXInOiBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcjcGxheWVyJyl9LFxuICAgIHsnc2VhcmNoJzogZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI3NlYXJjaCcpfSxcbiAgICB7J3Byb21wdCc6IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNwcm9tcHQnKX1cbiAgXSk7XG5cbiAgaWYgKCFPQVVUSF9UT0tFTikge1xuICAgIHJvdXRlci5yb3V0ZSgncHJvbXB0Jyk7XG4gIH0gZWxzZSB7XG4gICAgcm91dGVyLnJvdXRlKCd2aWRlb3MnKTtcbiAgfVxuXG4gIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5leGl0LWJ0bicpXG4gICAgLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKGV2ZW50KSA9PiB7XG4gICAgICBwbGF5ZXIuZGVzdHJveSgpO1xuICAgICAgcm91dGVyLnJvdXRlKCd2aWRlb3MnKTtcbiAgICB9KTtcblxuICB2aWRlb19yb3cuc2V0X3ZpZGVvX2NsaWNrX2NhbGxiYWNrKCh2aWRlbykgPT4ge1xuICAgIGlmICh2aWRlby50eXBlID09ICdhcmNoaXZlJykge1xuICAgICAgcGxheWVyLmxvYWQoeyB2aWRlbzogdmlkZW8uaWQgfSk7XG4gICAgfSBlbHNlIGlmICh2aWRlby50eXBlID09ICdzdHJlYW0nKSB7XG4gICAgICBwbGF5ZXIubG9hZCh7IGNoYW5uZWw6IHZpZGVvLmNoYW5uZWwubmFtZSB9KTtcbiAgICB9XG4gICAgcm91dGVyLnJvdXRlKCdwbGF5ZXInKTtcbiAgfSk7XG5cbiAgdmlkZW9fcm93LnNldF9uYXZpZ2F0aW9uX2NhbGxiYWNrKChldmVudCkgPT4ge1xuICAgIGlmIChldmVudC5zZWN0aW9uID49IGV2ZW50LnRvdGFsX3NlY3Rpb25zIC0gMiAmJiBldmVudC5kYXRhKSB7XG4gICAgICBhcGkuZ2V0X3VzZXJfdmlkZW9zKGV2ZW50LmRhdGEudXNlcm5hbWUsIGV2ZW50LmRhdGEubGltaXQsIGV2ZW50LnZpZGVvcylcbiAgICAgICAgLnRoZW4oKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgZXZlbnQucm93LnB1c2gocmVzcG9uc2UudmlkZW9zKTtcbiAgICAgICAgfSk7XG4gICAgfVxuICB9KTtcblxuICBzbGlkZS5zZXRfd2F0Y2hfbm93X2NhbGxiYWNrKChzdHJlYW0pID0+IHtcbiAgICBwbGF5ZXIubG9hZCh7IGNoYW5uZWw6IHN0cmVhbS5uYW1lIH0pO1xuICAgIHJvdXRlci5yb3V0ZSgncGxheWVyJyk7XG4gIH0pO1xuXG4gIGFwaS5nZXRfdXNlcihPQVVUSF9UT0tFTilcbiAgICAudGhlbigodXNlcikgPT4ge1xuICAgICAgYXBpLmdldF91c2VyX3N0cmVhbV9mb2xsb3dzKE9BVVRIX1RPS0VOKVxuICAgICAgICAudGhlbigoc3RyZWFtcykgPT4ge1xuICAgICAgICAgIGxldCBpc19maXJzdCA9IHRydWU7XG4gICAgICAgICAgc3RyZWFtcy5mb3JFYWNoKChzdHJlYW0pID0+IHtcbiAgICAgICAgICAgIGxldCBzID0gbmV3IHNsaWRlKHN0cmVhbSk7XG4gICAgICAgICAgICBsZXQgZWxlbWVudCA9IHMuZWxlbWVudDtcbiAgICAgICAgICAgIGlmIChpc19maXJzdCkge1xuICAgICAgICAgICAgICBlbGVtZW50LnF1ZXJ5U2VsZWN0b3IoJy5oZXJvX19zbGlkZScpLmNsYXNzTGlzdC5hZGQoJ3Zpc2libGUnKTtcbiAgICAgICAgICAgICAgaXNfZmlyc3QgPSBmYWxzZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5oZXJvJykuYXBwZW5kQ2hpbGQoZWxlbWVudCk7XG4gICAgICAgICAgfSk7XG5cbiAgICAgICAgICBsZXQgcm93ID0gbmV3IHZpZGVvX3JvdygnTGl2ZScsIHN0cmVhbXMpO1xuICAgICAgICAgIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyN2aWRlb3MnKS5hcHBlbmRDaGlsZChyb3cuZWxlbWVudCk7XG5cbiAgICAgICAgICByZXR1cm47XG4gICAgICAgIH0pXG4gICAgICAgIC50aGVuKCgpID0+IHtcbiAgICAgICAgICBhcGkuZ2V0X2ZvbGxvd3MoT0FVVEhfVE9LRU4sIHVzZXIubmFtZSlcbiAgICAgICAgICAudGhlbigoY2hhbm5lbHMpID0+IHtcbiAgICAgICAgICAgIHF1ZXVlX3Jvd3MoY2hhbm5lbHMuZm9sbG93cylcbiAgICAgICAgICAgICAgLnRoZW4oKCkgPT4ge1xuXG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9KTtcbiAgICB9KTtcblxuXG5cbiAgbGV0IGhlcm9faGlnaGxpZ2h0X3Nwb3RzID0gMTtcbiAgbGV0IGhlcm9fc3BvdGxpZ2h0cyA9IFtdO1xuXG4gIGZ1bmN0aW9uIHF1ZXVlX3Jvd3ModXNlcnMpIHtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgaWYgKHVzZXJzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgZmlsbCh1c2Vyc1swXSlcbiAgICAgICAgICAudGhlbigoKSA9PiB7XG4gICAgICAgICAgICBpZiAodXNlcnMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgICBxdWV1ZV9yb3dzKHVzZXJzLnNsaWNlKDEsIHVzZXJzLmxlbmd0aCkpLnRoZW4ocmVzb2x2ZSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXNvbHZlKCk7XG4gICAgICB9XG4gICAgfSlcbiAgfVxuXG4gIGZ1bmN0aW9uIGZpbGwodXNlciwgaXNMYXN0KSB7XG4gICAgbGV0IHJvdyA9IG5ldyB2aWRlb19yb3codXNlci5jaGFubmVsLmRpc3BsYXlfbmFtZSwgbnVsbCwgeyB1c2VybmFtZTogdXNlci5jaGFubmVsLm5hbWUsIGxpbWl0OiAxMH0pO1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICBhcGkuZ2V0X3VzZXJfdmlkZW9zKHVzZXIuY2hhbm5lbC5uYW1lLCAxMClcbiAgICAgICAgLnRoZW4oKHJlc3BvbnNlKSA9PiB7XG4gICAgICAgICAgaWYgKHJlc3BvbnNlLnZpZGVvcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICByb3cucHVzaChyZXNwb25zZS52aWRlb3MpO1xuICAgICAgICAgICAgZG9jdW1lbnQucXVlcnlTZWxlY3RvcignI3ZpZGVvcycpLmFwcGVuZENoaWxkKHJvdy5lbGVtZW50KTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcmVzb2x2ZSgpO1xuICAgICAgICB9KTtcbiAgICB9KVxuICB9XG5cbiAgLy8gYXBpLmdldF91c2VyX3ZpZGVvcygnY2lybm9fdHYnLCAxNilcbiAgLy8gICAudGhlbigocmVzcG9uc2UpID0+IHtcbiAgLy8gICAgIGxldCByb3cgPSBuZXcgdmlkZW9fcm93KCdDaXJubyBUVicsIHJlc3BvbnNlLnZpZGVvcywgeyB1c2VybmFtZTogJ2Npcm5vX3R2JywgbGltaXQ6IDggfSk7XG4gIC8vICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgndmlkZW9zJykuYXBwZW5kQ2hpbGQocm93LmVsZW1lbnQpO1xuICAvL1xuICAvLyAgICAgZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLnNsaWRlX19pbWFnZScpLnNyYyA9IHJlc3BvbnNlLnZpZGVvc1swXS50aHVtYm5haWw7XG4gIC8vXG4gIC8vICAgICBhcGkuZ2V0X3VzZXJfdmlkZW9zKCd0cnVtcHNjJywgMTYpXG4gIC8vICAgICAudGhlbigocmVzcG9uc2UpID0+IHtcbiAgLy8gICAgICAgbGV0IHJvdyA9IG5ldyB2aWRlb19yb3coJ1RydW1wJywgcmVzcG9uc2UudmlkZW9zLCB7IHVzZXJuYW1lOiAndHJ1bXBzYycsIGxpbWl0OiA4IH0pO1xuICAvLyAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCgndmlkZW9zJykuYXBwZW5kQ2hpbGQocm93LmVsZW1lbnQpO1xuICAvLyAgICAgfSk7XG4gIC8vICAgfSk7XG5cblxufSk7XG4iLCJjbGFzcyBzbGlkZSB7XG4gIGNvbnN0cnVjdG9yKHN0cmVhbSkge1xuICAgIHRoaXMuc2xpZGUgPSBkb2N1bWVudC5pbXBvcnROb2RlKGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNoZXJvLXRlbXBsYXRlJykuY29udGVudCwgdHJ1ZSk7XG5cbiAgICB0aGlzLnNsaWRlLnF1ZXJ5U2VsZWN0b3IoJy5zbGlkZV9faW1hZ2UnKS5zcmMgPSBzdHJlYW0uY2hhbm5lbC5wcm9maWxlX2Jhbm5lciB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0cmVhbS5jaGFubmVsLnZpZGVvX2Jhbm5lciB8fFxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN0cmVhbS5jaGFubmVsLmxvZ287XG4gICAgdGhpcy5zbGlkZS5xdWVyeVNlbGVjdG9yKCcuc2xpZGVfX2NvbnRlbnRfX2NoYW5uZWwnKS5pbm5lclRleHQgPSBzdHJlYW0uY2hhbm5lbC5kaXNwbGF5X25hbWU7XG4gICAgdGhpcy5zbGlkZS5xdWVyeVNlbGVjdG9yKCcuc2xpZGVfX2NvbnRlbnRfX2Rlc2NyaXB0aW9uJykuaW5uZXJUZXh0ID0gc3RyZWFtLmNoYW5uZWwuc3RhdHVzIHx8IFwiU3RyZWFtaW5nIExpdmVcIjtcbiAgICB0aGlzLnNsaWRlLnF1ZXJ5U2VsZWN0b3IoJy53YXRjaC1ub3ctYnV0dG9uJykuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoZXZlbnQpID0+IHtcbiAgICAgIHNsaWRlLnByb3RvdHlwZS53YXRjaF9ub3dfY2FsbGJhY2soe1xuICAgICAgICBuYW1lOiBzdHJlYW0uY2hhbm5lbC5uYW1lXG4gICAgICB9KVxuICAgIH0pO1xuICB9XG5cbiAgc3RhdGljIHNldF93YXRjaF9ub3dfY2FsbGJhY2soZm4pIHtcbiAgICBzbGlkZS5wcm90b3R5cGUud2F0Y2hfbm93X2NhbGxiYWNrID0gZm47XG4gIH1cblxuICBnZXQgZWxlbWVudCgpIHtcbiAgICByZXR1cm4gdGhpcy5zbGlkZTtcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBzbGlkZTtcbiIsImNsYXNzIHBsYXllciB7XG4gIGNvbnN0cnVjdG9yKGlkKSB7XG4gICAgdGhpcy5pZCA9IGlkO1xuICAgIHRoaXMucGxheWVyO1xuXG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ3Jlc2l6ZScsIChldmVudCkgPT4ge1xuICAgICAgaWYgKHRoaXMucGxheWVyKSB7XG4gICAgICAgIGxldCBpID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignaWZyYW1lJyk7XG4gICAgICAgIGkud2lkdGggPSB3aW5kb3cuaW5uZXJXaWR0aDtcbiAgICAgICAgaS5oZWlnaHQgPSB3aW5kb3cuaW5uZXJIZWlnaHQ7XG4gICAgICB9XG4gICAgfSk7XG4gIH1cblxuICBsb2FkKG9wdGlvbnMgPSB7dmlkZW8sIGNoYW5uZWx9KSB7XG4gICAgbGV0IGNvbmZpZyA9IHtcbiAgICAgIHdpZHRoOiB3aW5kb3cuaW5uZXJXaWR0aCxcbiAgICAgIGhlaWdodDogd2luZG93LmlubmVySGVpZ2h0XG4gICAgfTtcbiAgICBpZiAob3B0aW9ucy52aWRlbykgY29uZmlnLnZpZGVvID0gb3B0aW9ucy52aWRlbztcbiAgICBpZiAob3B0aW9ucy5jaGFubmVsKSBjb25maWcuY2hhbm5lbCA9IG9wdGlvbnMuY2hhbm5lbDtcblxuICAgIHRoaXMucGxheWVyID0gbmV3IFR3aXRjaC5QbGF5ZXIodGhpcy5pZCwgY29uZmlnKTtcbiAgfVxuXG4gIHBsYXkoKSB7XG4gICAgdGhpcy5wbGF5ZXIucGxheSgpO1xuICB9XG5cbiAgcGF1c2UoKSB7XG4gICAgdGhpcy5wbGF5ZXIucGF1c2UoKTtcbiAgfVxuXG4gIGRlc3Ryb3koKSB7XG4gICAgdGhpcy5wbGF5ZXIgPSAnJztcbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZCh0aGlzLmlkKS5pbm5lckhUTUwgPSAnJztcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCBwbGF5ZXI7XG4iLCJjbGFzcyBwb3N0ZXIge1xuICBjb25zdHJ1Y3RvcihnYW1lKSB7XG4gICAgdGhpcy5wb3N0ZXIgPSBkb2N1bWVudC5pbXBvcnROb2RlKGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNwb3N0ZXItdGVtcGxhdGUnKS5jb250ZW50LCB0cnVlKTtcblxuICAgIGlmICghZ2FtZS50aHVtYm5haWwpIHtcblxuICAgIH1cblxuICAgIGlmIChnYW1lLnR5cGUgPT0gJ3N0cmVhbScpIHtcbiAgICAgIGdhbWUudGh1bWJuYWlsID0gZ2FtZS5jaGFubmVsLnByb2ZpbGVfYmFubmVyIHx8IGdhbWUuY2hhbm5lbC5sb2dvIHx8ICcnO1xuICAgICAgZ2FtZS5uYW1lID0gZ2FtZS5jaGFubmVsLmRpc3BsYXlfbmFtZSB8fCBnYW1lLmNoYW5uZWwubmFtZTtcbiAgICB9XG5cbiAgICB0aGlzLnBvc3Rlci5xdWVyeVNlbGVjdG9yKCcudmlkZW9fX2ltYWdlJykuc3JjID0gZ2FtZS50aHVtYm5haWw7XG4gICAgdGhpcy5wb3N0ZXIucXVlcnlTZWxlY3RvcignLnZpZGVvX190aXRsZScpLmlubmVyVGV4dCA9IGdhbWUubmFtZS5sZW5ndGggPiAxNiA/IGdhbWUubmFtZS5zdWJzdHIoMCwgMTYpICsgJy4uLicgOiBnYW1lLm5hbWU7XG4gIH1cblxuICBnZXQgZWxlbWVudCgpIHtcbiAgICByZXR1cm4gdGhpcy5wb3N0ZXI7XG4gIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgcG9zdGVyO1xuIiwiY2xhc3Mgcm91dGVyIHtcbiAgY29uc3RydWN0b3Iocm91dGVzID0ge30pIHtcbiAgICB0aGlzLnJvdXRlcyA9IHJvdXRlcztcbiAgICB0aGlzLmFjdGl2ZV9yb3V0ZTtcbiAgfVxuXG4gIHJvdXRlKG5hbWUpIHtcbiAgICBpZiAodGhpcy5hY3RpdmVfcm91dGUpIHRoaXMuYWN0aXZlX3JvdXRlLmNsYXNzTGlzdC5yZW1vdmUoJ3Zpc2libGUnKTtcbiAgICB0aGlzLmFjdGl2ZV9yb3V0ZSA9IHRoaXMucm91dGVzW25hbWVdO1xuICAgIHRoaXMucm91dGVzW25hbWVdLmNsYXNzTGlzdC5hZGQoJ3Zpc2libGUnKTtcbiAgfVxuXG4gIGFkZF9yb3V0ZShyb3V0ZSkge1xuICAgIGlmIChBcnJheS5pc0FycmF5KHJvdXRlKSkge1xuICAgICAgcm91dGUuZm9yRWFjaCgocikgPT4ge1xuICAgICAgICB0aGlzLmFkZF9yb3V0ZShyKTtcbiAgICAgIH0pO1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIGxldCBrZXlzID0gT2JqZWN0LmtleXMocm91dGUpO1xuICAgIHRoaXMucm91dGVzW2tleXNbMF1dID0gcm91dGVba2V5c1swXV07XG4gICAgY29uc29sZS5sb2codGhpcy5yb3V0ZXNba2V5c1swXV0pO1xuICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IHJvdXRlcjtcbiIsImNsYXNzIHN0b3JhZ2Uge1xuICBjb25zdHJ1Y3RvcihuYW1lc3BhY2UpIHtcbiAgICB0aGlzLmxvYWRfc3RvcmFnZV9tYXAobmFtZXNwYWNlKTtcbiAgfVxuICB1bmlxdWVfaWQoc2l6ZSkge1xuICAgIGxldCBhbHBoYWJldCA9ICdhYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5ekFCQ0RFRkdISUpLTE1OT1BRUlNUVVZXWFlaMTIzNDU2Nzg5MCQmLV8rJztcbiAgICBsZXQgaWQgPSAnJztcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHNpemU7IGkrKykge1xuICAgICAgaWQgKz0gYWxwaGFiZXRbTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogYWxwaGFiZXQubGVuZ3RoKV07XG4gICAgfVxuXG4gICAgT2JqZWN0LmtleXModGhpcy5zdG9yYWdlX21hcCkuZm9yRWFjaCgoa2V5KSA9PiB7XG4gICAgICBpZiAoa2V5ID09PSBpZCkge1xuICAgICAgICByZXR1cm4gdW5pcXVlX2lkKHNpemUpO1xuICAgICAgfVxuICAgIH0pO1xuXG4gICAgcmV0dXJuIGlkO1xuICB9XG4gIHNhdmUobmFtZSwgZGF0YSkge1xuICAgIGlmICghdGhpcy5zdG9yYWdlX21hcFtuYW1lXSkge1xuICAgICAgdGhpcy5zdG9yYWdlX21hcFtuYW1lXSA9IHRoaXMudW5pcXVlX2lkKDUpO1xuICAgIH1cbiAgICBsZXQga2V5ID0gdGhpcy5zdG9yYWdlX21hcFtuYW1lXTtcbiAgICB3aW5kb3cubG9jYWxTdG9yYWdlLnNldEl0ZW0oYHN0b3JhZ2UtJHt0aGlzLm5hbWVzcGFjZX0tJHtrZXl9YCwgKHR5cGVvZiBkYXRhID09ICdPYmplY3QnKSA/IEpTT04uc3RyaW5naWZ5KGRhdGEpIDogZGF0YSk7XG4gICAgdGhpcy5zYXZlX3N0b3JhZ2VfbWFwKCk7XG4gIH1cbiAgbG9hZChuYW1lKSB7XG4gICAgcmV0dXJuIHdpbmRvdy5sb2NhbFN0b3JhZ2UuZ2V0SXRlbShgc3RvcmFnZS0ke3RoaXMubmFtZXNwYWNlfS0ke3RoaXMuc3RvcmFnZV9tYXBbbmFtZV19YCkgfHwgZmFsc2U7XG4gIH1cbiAgZGVsZXRlKG5hbWUpIHtcbiAgICB3aW5kb3cubG9jYWxTdG9yYWdlLnJlbW92ZUl0ZW0oYHN0b3JhZ2UtJHt0aGlzLm5hbWVzcGFjZX0tJHt0aGlzLnN0b3JhZ2VfbWFwW25hbWVdfWApO1xuICB9XG4gIHNhdmVfc3RvcmFnZV9tYXAoKSB7XG4gICAgd2luZG93LmxvY2FsU3RvcmFnZS5zZXRJdGVtKGBzdG9yYWdlLSR7dGhpcy5uYW1lc3BhY2V9YCwgSlNPTi5zdHJpbmdpZnkodGhpcy5zdG9yYWdlX21hcCkpO1xuICB9XG4gIGxvYWRfc3RvcmFnZV9tYXAobmFtZXNwYWNlKSB7XG4gICAgdGhpcy5uYW1lc3BhY2UgPSBuYW1lc3BhY2U7XG4gICAgdGhpcy5zdG9yYWdlX21hcCA9IEpTT04ucGFyc2Uod2luZG93LmxvY2FsU3RvcmFnZS5nZXRJdGVtKGBzdG9yYWdlLSR7dGhpcy5uYW1lc3BhY2V9YCkgfHwgJ3t9Jyk7XG4gIH1cbn1cblxuZXhwb3J0IGRlZmF1bHQgc3RvcmFnZTtcbiIsImltcG9ydCBhamF4IGZyb20gJy4vYWpheC5qcyc7XG5cbmxldCBodHRwID0gbmV3IGFqYXgoKTtcblxuY2xhc3MgdHdpdGNoIHtcbiAgY29uc3RydWN0b3IoKSB7XG4gICAgdGhpcy5iYXNlX3VybCA9ICdodHRwczovL2FwaS50d2l0Y2gudHYva3Jha2VuJztcbiAgfVxuXG4gIGdldF91c2VyKHRva2VuKSB7XG4gICAgbGV0IHVybCA9IGAke3RoaXMuYmFzZV91cmx9L3VzZXI/b2F1dGhfdG9rZW49JHt0b2tlbn1gO1xuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XG4gICAgICBodHRwLmdldCh1cmwsIHRydWUpXG4gICAgICAgIC50aGVuKChfZGF0YSkgPT4ge1xuICAgICAgICAgIHJlc29sdmUoX2RhdGEpO1xuICAgICAgICB9KVxuICAgICAgICAuY2F0Y2goY29uc29sZS5lcnJvcik7XG4gICAgfSk7XG4gIH1cblxuICBnZXRfZm9sbG93cyh0b2tlbiwgdXNlcikge1xuICAgIGxldCB1cmwgPSBgJHt0aGlzLmJhc2VfdXJsfS91c2Vycy8ke3VzZXJ9L2ZvbGxvd3MvY2hhbm5lbHM/b2F1dGhfdG9rZW49JHt0b2tlbn0mbGltaXQ9MTAwYDtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgaHR0cC5nZXQodXJsLCB0cnVlKVxuICAgICAgICAudGhlbigoX2RhdGEpID0+IHtcbiAgICAgICAgICBfZGF0YS5mb2xsb3dzLnNvcnQoKGEsIGIpID0+IHtcbiAgICAgICAgICAgIGlmIChhLmNoYW5uZWwuZGlzcGxheV9uYW1lLnRvTG93ZXJDYXNlKCkgPCBiLmNoYW5uZWwuZGlzcGxheV9uYW1lLnRvTG93ZXJDYXNlKCkpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIC0xO1xuICAgICAgICAgICAgfSBlbHNlIGlmIChhLmNoYW5uZWwuZGlzcGxheV9uYW1lLnRvTG93ZXJDYXNlKCkgPiBiLmNoYW5uZWwuZGlzcGxheV9uYW1lLnRvTG93ZXJDYXNlKCkpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIDE7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICByZXR1cm4gMDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KTtcblxuICAgICAgICAgIHJlc29sdmUoX2RhdGEpO1xuICAgICAgICB9KVxuICAgICAgICAuY2F0Y2goY29uc29sZS5lcnJvcik7XG4gICAgfSk7XG5cbiAgfVxuXG4gIGdldF90b3BfZ2FtZXMobGltaXQgPSAxNSwgb2Zmc2V0ID0gMCkge1xuICAgIGxldCB1cmwgPSBgJHt0aGlzLmJhc2VfdXJsfS9nYW1lcy90b3A/bGltaXQ9JHtsaW1pdH0mb2Zmc2V0PSR7b2Zmc2V0fWA7XG4gICAgbGV0IGRhdGEgPSB7fTtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgaHR0cC5nZXQodXJsLCB0cnVlKVxuICAgICAgICAudGhlbigoX2RhdGEpID0+IHtcbiAgICAgICAgICBkYXRhLm5leHQgPSBfZGF0YS5fbGlua3MubmV4dDtcbiAgICAgICAgICBkYXRhLmdhbWVzID0gW107XG5cbiAgICAgICAgICBfZGF0YS50b3AuZm9yRWFjaCgoaXRlbSkgPT4ge1xuICAgICAgICAgICAgbGV0IGdhbWUgPSB7fTtcbiAgICAgICAgICAgIGdhbWUudmlld2VycyA9IGl0ZW0udmlld2VycztcbiAgICAgICAgICAgIGdhbWUuY2hhbm5lbHMgPSBpdGVtLmNoYW5uZWxzO1xuICAgICAgICAgICAgZ2FtZS5uYW1lID0gaXRlbS5nYW1lLm5hbWU7XG4gICAgICAgICAgICBnYW1lLnBvc3RlcnMgPSB7XG4gICAgICAgICAgICAgIGxhcmdlOiBpdGVtLmdhbWUuYm94LmxhcmdlLFxuICAgICAgICAgICAgICBtZWRpdW06IGl0ZW0uZ2FtZS5ib3gubWVkaXVtLFxuICAgICAgICAgICAgICBzbWFsbDogaXRlbS5nYW1lLmJveC5zbWFsbFxuICAgICAgICAgICAgfVxuICAgICAgICAgICAgZ2FtZS50aHVtYm5haWwgPSBpdGVtLmdhbWUuYm94Lm1lZGl1bTtcblxuICAgICAgICAgICAgZGF0YS5nYW1lcy5wdXNoKGdhbWUpO1xuICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgcmVzb2x2ZShkYXRhKTtcbiAgICAgICAgfSlcbiAgICAgICAgLmNhdGNoKGNvbnNvbGUuZXJyb3IpO1xuICAgIH0pO1xuICB9XG5cbiAgZ2V0X3RvcF92aWRlb3MobGltaXQgPSAxNSwgb2Zmc2V0ID0gMCwgZ2FtZSwgcGVyaW9kKSB7XG4gICAgbGV0IHVybCA9IGAke3RoaXMuYmFzZV91cmx9L3ZpZGVvcy90b3A/bGltaXQ9JHtsaW1pdH0mb2Zmc2V0PSR7b2Zmc2V0fSR7Z2FtZSA/ICcmZ2FtZT0nICsgZ2FtZSA6ICcnfSR7cGVyaW9kID8gJyZwZXJpb2Q9JyArIHBlcmlvZCA6ICcnfWA7XG4gICAgbGV0IGRhdGEgPSB7fTtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgaHR0cC5nZXQodXJsLCB0cnVlKVxuICAgICAgICAudGhlbigoX2RhdGEpID0+IHtcbiAgICAgICAgICBkYXRhLm5leHQgPSBfZGF0YS5fbGlua3MubmV4dDtcbiAgICAgICAgICBkYXRhLnZpZGVvcyA9IFtdO1xuXG4gICAgICAgICAgX2RhdGEudmlkZW9zLmZvckVhY2goKGl0ZW0pID0+IHtcbiAgICAgICAgICAgIGxldCB2aWRlbyA9IHt9O1xuICAgICAgICAgICAgdmlkZW8ubmFtZSA9IGl0ZW0udGl0bGU7XG4gICAgICAgICAgICB2aWRlby5kZXNjcmlwdGlvbiA9IGl0ZW0uZGVzY3JpcHRpb247XG4gICAgICAgICAgICB2aWRlby5icm9hZGNhc3RfaWQgPSBpdGVtLmJyb2FkY2FzdF9pZDtcbiAgICAgICAgICAgIHZpZGVvLmlkID0gaXRlbS5faWQ7XG4gICAgICAgICAgICB2aWRlby50eXBlID0gaXRlbS5icm9hZGNhc3RfdHlwZTtcbiAgICAgICAgICAgIHZpZGVvLnZpZXdzID0gaXRlbS52aWV3cztcbiAgICAgICAgICAgIHZpZGVvLmNyZWF0ZWRfYXQgPSBpdGVtLmNyZWF0ZWRfYXQ7XG4gICAgICAgICAgICB2aWRlby5nYW1lID0gaXRlbS5nYW1lO1xuICAgICAgICAgICAgdmlkZW8uY2hhbm5lbCA9IGl0ZW0uY2hhbm5lbC5uYW1lO1xuICAgICAgICAgICAgdmlkZW8uY2hhbm5lbF9kaXNwbGF5X25hbWUgPSBpdGVtLmNoYW5uZWwuZGlzcGxheV9uYW1lO1xuICAgICAgICAgICAgdmlkZW8udGh1bWJuYWlsID0gaXRlbS50aHVtYm5haWxzWzBdLnVybDtcblxuICAgICAgICAgICAgZGF0YS52aWRlb3MucHVzaCh2aWRlbyk7XG4gICAgICAgICAgfSk7XG5cbiAgICAgICAgICByZXNvbHZlKGRhdGEpO1xuICAgICAgICB9KVxuICAgICAgICAuY2F0Y2goY29uc29sZS5lcnJvcik7XG4gICAgfSk7XG4gIH1cblxuICBnZXRfdXNlcl92aWRlb3MoY2hhbm5lbCwgbGltaXQgPSAxNSwgb2Zmc2V0ID0gMCwgYnJvYWRjYXN0cyA9IHRydWUsIGhsc19vbmx5KSB7XG4gICAgbGV0IHVybCA9IGAke3RoaXMuYmFzZV91cmx9L2NoYW5uZWxzLyR7Y2hhbm5lbH0vdmlkZW9zP2xpbWl0PSR7bGltaXR9Jm9mZnNldD0ke29mZnNldH0ke2Jyb2FkY2FzdHMgPyAnJmJyb2FkY2FzdHM9dHJ1ZScgOiAnJ30ke2hsc19vbmx5ID8gJyZobHM9dHJ1ZScgOiAnJ31gO1xuICAgIGxldCBkYXRhID0ge307XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgIGh0dHAuZ2V0KHVybCwgdHJ1ZSlcbiAgICAgICAgLnRoZW4oKF9kYXRhKSA9PiB7XG4gICAgICAgICAgZGF0YS5uZXh0ID0gX2RhdGEuX2xpbmtzLm5leHQ7XG4gICAgICAgICAgZGF0YS52aWRlb3MgPSBbXTtcblxuICAgICAgICAgIF9kYXRhLnZpZGVvcy5mb3JFYWNoKChpdGVtKSA9PiB7XG4gICAgICAgICAgICBsZXQgdmlkZW8gPSB7fTtcbiAgICAgICAgICAgIHZpZGVvLm5hbWUgPSBpdGVtLnRpdGxlO1xuICAgICAgICAgICAgdmlkZW8uZGVzY3JpcHRpb24gPSBpdGVtLmRlc2NyaXB0aW9uO1xuICAgICAgICAgICAgdmlkZW8uYnJvYWRjYXN0X2lkID0gaXRlbS5icm9hZGNhc3RfaWQ7XG4gICAgICAgICAgICB2aWRlby5pZCA9IGl0ZW0uX2lkO1xuICAgICAgICAgICAgdmlkZW8udHlwZSA9IGl0ZW0uYnJvYWRjYXN0X3R5cGU7XG4gICAgICAgICAgICB2aWRlby52aWV3cyA9IGl0ZW0udmlld3M7XG4gICAgICAgICAgICB2aWRlby5jcmVhdGVkX2F0ID0gaXRlbS5jcmVhdGVkX2F0O1xuICAgICAgICAgICAgdmlkZW8uZ2FtZSA9IGl0ZW0uZ2FtZTtcbiAgICAgICAgICAgIHZpZGVvLmNoYW5uZWwgPSBpdGVtLmNoYW5uZWwubmFtZTtcbiAgICAgICAgICAgIHZpZGVvLmNoYW5uZWxfZGlzcGxheV9uYW1lID0gaXRlbS5jaGFubmVsLmRpc3BsYXlfbmFtZTtcbiAgICAgICAgICAgIHZpZGVvLnRodW1ibmFpbCA9IGl0ZW0udGh1bWJuYWlsc1swXS51cmw7XG5cbiAgICAgICAgICAgIGRhdGEudmlkZW9zLnB1c2godmlkZW8pO1xuICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgcmVzb2x2ZShkYXRhKTtcbiAgICAgICAgfSlcbiAgICAgICAgLmNhdGNoKGNvbnNvbGUuZXJyb3IpO1xuICAgIH0pO1xuICB9XG5cbiAgZ2V0X3N0cmVhbShjaGFubmVsKSB7XG4gICAgbGV0IHVybCA9IGAke3RoaXMuYmFzZV91cmx9L3N0cmVhbXMvJHtjaGFubmVsfWA7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgIGh0dHAuZ2V0KHVybCwgdHJ1ZSlcbiAgICAgICAgLnRoZW4oKF9kYXRhKSA9PiB7XG4gICAgICAgICAgcmVzb2x2ZShfZGF0YSk7XG4gICAgICAgIH0pO1xuICAgIH0pXG4gICAgLmNhdGNoKGNvbnNvbGUuZXJyb3IpO1xuICB9XG5cbiAgZ2V0X3VzZXJfdmlkZW9fZm9sbG93cyh0b2tlbikge1xuICAgIGxldCB1cmwgPSBgJHt0aGlzLmJhc2VfdXJsfS92aWRlb3MvZm9sbG93ZWQ/b2F1dGhfdG9rZW49JHt0b2tlbn0mbGltaXQ9MTAwYDtcbiAgICByZXR1cm4gbmV3IFByb21pc2UoKHJlc29sdmUsIHJlamVjdCkgPT4ge1xuICAgICAgaHR0cC5nZXQodXJsLCB0cnVlKVxuICAgICAgICAudGhlbigoX2RhdGEpID0+IHtcbiAgICAgICAgICByZXNvbHZlKF9kYXRhLnN0cmVhbXMpO1xuICAgICAgICB9KVxuICAgICAgICAuY2F0Y2goY29uc29sZS5lcnJvcik7XG4gICAgfSk7XG4gIH1cblxuICBnZXRfdXNlcl9zdHJlYW1fZm9sbG93cyh0b2tlbikge1xuICAgIGxldCB1cmwgPSBgJHt0aGlzLmJhc2VfdXJsfS9zdHJlYW1zL2ZvbGxvd2VkP29hdXRoX3Rva2VuPSR7dG9rZW59JmxpbWl0PTEwMGA7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICAgIGh0dHAuZ2V0KHVybCwgdHJ1ZSlcbiAgICAgICAgLnRoZW4oKF9kYXRhKSA9PiB7XG4gICAgICAgICAgcmVzb2x2ZShfZGF0YS5zdHJlYW1zLm1hcCgoc3RyZWFtKSA9PiB7XG4gICAgICAgICAgICBzdHJlYW0udHlwZSA9ICdzdHJlYW0nO1xuICAgICAgICAgICAgcmV0dXJuIHN0cmVhbTtcbiAgICAgICAgICB9KSk7XG4gICAgICAgIH0pXG4gICAgICAgIC5jYXRjaChjb25zb2xlLmVycm9yKTtcbiAgICB9KTtcbiAgfVxufVxuXG5leHBvcnQgZGVmYXVsdCB0d2l0Y2g7XG4iLCJpbXBvcnQgcG9zdGVyIGZyb20gJy4vcG9zdGVyLmpzJztcblxuY2xhc3MgdmlkZW9fcm93IHtcbiAgY29uc3RydWN0b3IobmFtZSwgaW5pdGlhbF92aWRlb3MsIGRhdGEpIHtcbiAgICB0aGlzLnZpZGVvcyA9IFtdO1xuICAgIHRoaXMuZGF0YSA9IGRhdGEgfHwgZmFsc2U7XG4gICAgdGhpcy5yb3cgPSBkb2N1bWVudC5pbXBvcnROb2RlKGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJyNyb3ctdGVtcGxhdGUnKS5jb250ZW50LCB0cnVlKTtcbiAgICB0aGlzLnJvdy5xdWVyeVNlbGVjdG9yKCcudGl0bGUnKS5pbm5lclRleHQgPSBuYW1lO1xuICAgIHRoaXMud3JhcHBlciA9IHRoaXMucm93LnF1ZXJ5U2VsZWN0b3IoJy52aWRlb3MnKTtcblxuICAgIHRoaXMuc2VjdGlvbiA9IDA7XG4gICAgdGhpcy52aWRlb193aWR0aCA9IDMxNTtcbiAgICB0aGlzLnRvdGFsX3NlY3Rpb25zID0gMDtcbiAgICB0aGlzLnZpZGVvc19tYXNrID0gdGhpcy5yb3cucXVlcnlTZWxlY3RvcignLnZpZGVvc19fbWFzaycpO1xuICAgIHRoaXMuY29udHJvbF9sZWZ0ID0gdGhpcy5yb3cucXVlcnlTZWxlY3RvcignLnJvdy1jb250cm9sLS1sZWZ0Jyk7XG4gICAgdGhpcy5jb250cm9sX3JpZ2h0ID0gdGhpcy5yb3cucXVlcnlTZWxlY3RvcignLnJvdy1jb250cm9sLS1yaWdodCcpO1xuXG4gICAgdGhpcy5jb250cm9sX2xlZnQuYWRkRXZlbnRMaXN0ZW5lcignY2xpY2snLCAoZXZlbnQpID0+IHtcbiAgICAgIGlmICh0aGlzLnNlY3Rpb24gPiAwKSB7XG4gICAgICAgIHRoaXMuc2VjdGlvbi0tO1xuICAgICAgICB0aGlzLnZpZGVvc19tYXNrLnN0eWxlLnRyYW5zZm9ybSA9ICd0cmFuc2xhdGUzZCgnICsgKCh0aGlzLnZpZGVvX3dpZHRoICogKHdpbmRvdy5pbm5lcldpZHRoIC8gdGhpcy52aWRlb193aWR0aCkpICogLXRoaXMuc2VjdGlvbikgKyAncHgsIDAsIDApJztcbiAgICAgIH1cbiAgICAgIHZpZGVvX3Jvdy5wcm90b3R5cGUubmF2aWdhdGlvbl9jYWxsYmFjayh7IGRpcmVjdGlvbjogJ2xlZnQnICwgc2VjdGlvbjogdGhpcy5zZWN0aW9uLCB0b3RhbF9zZWN0aW9uczogdGhpcy50b3RhbF9zZWN0aW9ucywgcm93OiB0aGlzLCBkYXRhOiB0aGlzLmRhdGEsIHZpZGVvczogdGhpcy52aWRlb3MubGVuZ3RofSk7XG4gICAgfSk7XG4gICAgdGhpcy5jb250cm9sX3JpZ2h0LmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKGV2ZW50KSA9PiB7XG4gICAgICBpZiAoISgod2luZG93LmlubmVyV2lkdGggKiAuNykgKiAodGhpcy5zZWN0aW9uICsgMSkgPiB0aGlzLndyYXBwZXIub2Zmc2V0V2lkdGgpKSB7XG4gICAgICAgIHRoaXMuc2VjdGlvbisrO1xuICAgICAgICB0aGlzLnZpZGVvc19tYXNrLnN0eWxlLnRyYW5zZm9ybSA9ICd0cmFuc2xhdGUzZCgnICsgKCh0aGlzLnZpZGVvX3dpZHRoICogKHdpbmRvdy5pbm5lcldpZHRoIC8gdGhpcy52aWRlb193aWR0aCkpICogLXRoaXMuc2VjdGlvbikgKyAncHgsIDAsIDApJztcbiAgICAgIH1cbiAgICAgIHZpZGVvX3Jvdy5wcm90b3R5cGUubmF2aWdhdGlvbl9jYWxsYmFjayh7IGRpcmVjdGlvbjogJ3JpZ2h0JyAsIHNlY3Rpb246IHRoaXMuc2VjdGlvbiwgdG90YWxfc2VjdGlvbnM6IHRoaXMudG90YWxfc2VjdGlvbnMsIHJvdzogdGhpcywgZGF0YTogdGhpcy5kYXRhLCB2aWRlb3M6IHRoaXMudmlkZW9zLmxlbmd0aH0pO1xuICAgIH0pO1xuXG4gICAgaWYgKGluaXRpYWxfdmlkZW9zKSB7XG4gICAgICB0aGlzLnB1c2goaW5pdGlhbF92aWRlb3MpO1xuICAgIH1cbiAgfVxuXG4gIHN0YXRpYyBzZXRfdmlkZW9fY2xpY2tfY2FsbGJhY2soZm4pIHtcbiAgICB2aWRlb19yb3cucHJvdG90eXBlLnZpZGVvX2NsaWNrX2NhbGxiYWNrID0gZm47XG4gIH1cblxuICBzdGF0aWMgc2V0X25hdmlnYXRpb25fY2FsbGJhY2soZm4pIHtcbiAgICB2aWRlb19yb3cucHJvdG90eXBlLm5hdmlnYXRpb25fY2FsbGJhY2sgPSBmbjtcbiAgfVxuXG4gIHB1c2godmlkZW8pIHtcbiAgICBpZiAoQXJyYXkuaXNBcnJheSh2aWRlbykpIHtcbiAgICAgIHZpZGVvLmZvckVhY2goKHYpID0+IHtcbiAgICAgICAgdGhpcy5wdXNoKHYpO1xuICAgICAgfSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIFxuICAgIGxldCBlbGVtZW50ID0gbmV3IHBvc3Rlcih2aWRlbykuZWxlbWVudDtcbiAgICBlbGVtZW50LnF1ZXJ5U2VsZWN0b3IoJy52aWRlbycpLmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgKCkgPT4ge1xuICAgICAgdmlkZW9fcm93LnByb3RvdHlwZS52aWRlb19jbGlja19jYWxsYmFjayh2aWRlbyk7XG4gICAgfSk7XG4gICAgdGhpcy52aWRlb3MucHVzaCh2aWRlbyk7XG4gICAgdGhpcy53cmFwcGVyLmFwcGVuZENoaWxkKGVsZW1lbnQpO1xuICAgIHRoaXMudG90YWxfc2VjdGlvbnMgPSB0aGlzLndyYXBwZXIub2Zmc2V0V2lkdGggLyAoKHRoaXMudmlkZW9fd2lkdGggKiAod2luZG93LmlubmVyV2lkdGggLyB0aGlzLnZpZGVvX3dpZHRoKSkpO1xuICB9XG5cbiAgZ2V0IGVsZW1lbnQoKSB7XG4gICAgcmV0dXJuIHRoaXMucm93O1xuICB9XG59XG5cbmV4cG9ydCBkZWZhdWx0IHZpZGVvX3JvdztcbiJdfQ==
