import ajax from './ajax.js';

let http = new ajax();

/**
 * @class twitch
 * @description A wrapper for the Twitch API
 */
class twitch {
  /**
   * @constructor
   * @param {String} client_id The client id for the Twitch app
   */
  constructor(client_id) {
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
  get_user(token) {
    let url = `${this.base_url}/user?oauth_token=${token}`;
    return new Promise((resolve, reject) => {
      http.get(url, true, { 'Client-ID': this.client_id })
        .then((_data) => {
          resolve(_data);
        })
        .catch(console.error);
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
  get_follows(token, user) {
    let url = `${this.base_url}/users/${user}/follows/channels?oauth_token=${token}&limit=100`;
    return new Promise((resolve, reject) => {
      http.get(url, true, { 'Client-ID': this.client_id })
        .then((_data) => {
          // The `_data` name is here because previously there was
          //  a `data` variable in the same closure being constructed
          _data.follows.sort((a, b) => {
            if (a.channel.display_name.toLowerCase() < b.channel.display_name.toLowerCase()) {
              return -1;
            } else if (a.channel.display_name.toLowerCase() > b.channel.display_name.toLowerCase()) {
              return 1;
            } else {
              return 0;
            }
          });

          resolve(_data);
        })
        .catch(console.error);
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
  get_top_games(limit = 15, offset = 0) {
    let url = `${this.base_url}/games/top?limit=${limit}&offset=${offset}`;
    let data = {};
    return new Promise((resolve, reject) => {
      http.get(url, true, { 'Client-ID': this.client_id })
        .then((_data) => {
          data.next = _data._links.next;
          data.games = [];

          _data.top.forEach((item) => {
            let game = {};
            game.viewers = item.viewers;
            game.channels = item.channels;
            game.name = item.game.name;
            game.posters = {
              large: item.game.box.large,
              medium: item.game.box.medium,
              small: item.game.box.small
            }
            game.thumbnail = item.game.box.medium;

            data.games.push(game);
          });

          resolve(data);
        })
        .catch(console.error);
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
  get_top_videos(limit = 15, offset = 0, game, period) {
    let url = `${this.base_url}/videos/top?limit=${limit}&offset=${offset}${game ? '&game=' + game : ''}${period ? '&period=' + period : ''}`;
    let data = {};
    return new Promise((resolve, reject) => {
      http.get(url, true, { 'Client-ID': this.client_id })
        .then((_data) => {
          data.next = _data._links.next;
          data.videos = [];

          _data.videos.forEach((item) => {
            let video = {};
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
        })
        .catch(console.error);
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
  get_user_videos(channel, limit = 15, offset = 0, broadcasts = true, hls_only) {
    let url = `${this.base_url}/channels/${channel}/videos?limit=${limit}&offset=${offset}${broadcasts ? '&broadcasts=true' : ''}${hls_only ? '&hls=true' : ''}`;
    let data = {};
    return new Promise((resolve, reject) => {
      http.get(url, true, { 'Client-ID': this.client_id })
        .then((_data) => {
          data.next = _data._links.next;
          data.videos = [];

          _data.videos.forEach((item) => {
            console.log(item)
            let video = {};
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
        })
        .catch(console.error);
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
  get_stream(channel) {
    let url = `${this.base_url}/streams/${channel}`;
    return new Promise((resolve, reject) => {
      http.get(url, true, { 'Client-ID': this.client_id })
        .then((_data) => {
          resolve(_data);
        });
    })
    .catch(console.error);
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
  get_user_video_follows(token) {
    let url = `${this.base_url}/videos/followed?oauth_token=${token}&limit=100`;
    return new Promise((resolve, reject) => {
      http.get(url, true, { 'Client-ID': this.client_id })
        .then((_data) => {
          resolve(_data.streams);
        })
        .catch(console.error);
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
  get_user_stream_follows(token) {
    let url = `${this.base_url}/streams/followed?oauth_token=${token}&limit=100`;
    return new Promise((resolve, reject) => {
      http.get(url, true, { 'Client-ID': this.client_id })
        .then((_data) => {
          resolve(_data.streams.map((stream) => {
            stream.type = 'stream';
            return stream;
          }));
        })
        .catch(console.error);
    });
  }
}

export default twitch;
