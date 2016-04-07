import ajax from './ajax.js';

let http = new ajax();

class twitch {
  constructor() {
    this.base_url = 'https://api.twitch.tv/kraken';
  }

  get_user(token) {
    let url = `${this.base_url}/user?oauth_token=${token}`;
    return new Promise((resolve, reject) => {
      http.get(url, true)
        .then((_data) => {
          resolve(_data);
        })
        .catch(console.error);
    });
  }

  get_follows(token, user) {
    let url = `${this.base_url}/users/${user}/follows/channels?oauth_token=${token}&limit=100`;
    return new Promise((resolve, reject) => {
      http.get(url, true)
        .then((_data) => {
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

  get_top_games(limit = 15, offset = 0) {
    let url = `${this.base_url}/games/top?limit=${limit}&offset=${offset}`;
    let data = {};
    return new Promise((resolve, reject) => {
      http.get(url, true)
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

  get_top_videos(limit = 15, offset = 0, game, period) {
    let url = `${this.base_url}/videos/top?limit=${limit}&offset=${offset}${game ? '&game=' + game : ''}${period ? '&period=' + period : ''}`;
    let data = {};
    return new Promise((resolve, reject) => {
      http.get(url, true)
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

  get_user_videos(channel, limit = 15, offset = 0, broadcasts = true, hls_only) {
    let url = `${this.base_url}/channels/${channel}/videos?limit=${limit}&offset=${offset}${broadcasts ? '&broadcasts=true' : ''}${hls_only ? '&hls=true' : ''}`;
    let data = {};
    return new Promise((resolve, reject) => {
      http.get(url, true)
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

  get_stream(channel) {
    let url = `${this.base_url}/streams/${channel}`;
    return new Promise((resolve, reject) => {
      http.get(url, true)
        .then((_data) => {
          resolve(_data);
        });
    })
    .catch(console.error);
  }

  get_user_video_follows(token) {
    let url = `${this.base_url}/videos/followed?oauth_token=${token}&limit=100`;
    return new Promise((resolve, reject) => {
      http.get(url, true)
        .then((_data) => {
          resolve(_data.streams);
        })
        .catch(console.error);
    });
  }

  get_user_stream_follows(token) {
    let url = `${this.base_url}/streams/followed?oauth_token=${token}&limit=100`;
    return new Promise((resolve, reject) => {
      http.get(url, true)
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
