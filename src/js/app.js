import twitch from './twitch.js';
import storage from './storage.js';
import slide from './hero-slide.js';
import video_row from './video-row.js';
import {default as blink_router} from './router.js';
import {default as blink_player} from './player.js';

const client_id = 'bm02n8wxxzqmzvfb0zlebd5ye2rn0r7';

let api = new twitch(client_id);
let db = new storage('blink');
let router = new blink_router();

let OAUTH_TOKEN = db.load('oauth_token');

if (!OAUTH_TOKEN) {
  let hash = document.location.hash.substr(1, document.location.hash.length);
  let pairs = hash.split('&');
  pairs.forEach((pair) => {
    let keys = pair.split('=');
    if (keys[0] == 'access_token') {
      OAUTH_TOKEN = keys[1];
      db.save('oauth_token', OAUTH_TOKEN);
      document.location.hash = '/';
    }
  });
}

window.addEventListener('load', (event) => {
  let player = new blink_player('player-wrapper');


  router.add_route([
    {'videos': document.querySelector('#videos')},
    {'player': document.querySelector('#player')},
    {'search': document.querySelector('#search')},
    {'prompt': document.querySelector('#prompt')}
  ]);

  if (!OAUTH_TOKEN) {
    router.route('prompt');
  } else {
    router.route('videos');
  }

  document.querySelector('.exit-btn')
    .addEventListener('click', (event) => {
      player.destroy();
      router.route('videos');
    });

  video_row.set_video_click_callback((video) => {
    if (video.type == 'archive') {
      player.load({ video: video.id });
    } else if (video.type == 'stream') {
      player.load({ channel: video.channel.name });
    }
    router.route('player');
  });

  video_row.set_navigation_callback((event) => {
    if (event.section >= event.total_sections - 2 && event.data) {
      api.get_user_videos(event.data.username, event.data.limit, event.videos)
        .then((response) => {
          event.row.push(response.videos);
        });
    }
  });

  slide.set_watch_now_callback((stream) => {
    player.load({ channel: stream.name });
    router.route('player');
  });

  api.get_user(OAUTH_TOKEN)
    .then((user) => {
      api.get_user_stream_follows(OAUTH_TOKEN)
        .then((streams) => {
          let is_first = true;
          streams.forEach((stream) => {
            let s = new slide(stream);
            let element = s.element;
            if (is_first) {
              element.querySelector('.hero__slide').classList.add('visible');
              is_first = false;
            }
            document.querySelector('.hero').appendChild(element);
          });

          let row = new video_row('Live', streams);
          document.querySelector('#videos').appendChild(row.element);

          return;
        })
        .then(() => {
          api.get_follows(OAUTH_TOKEN, user.name)
          .then((channels) => {
            queue_rows(channels.follows)
              .then(() => {

              });
          });
        });
    });



  let hero_highlight_spots = 1;
  let hero_spotlights = [];

  function queue_rows(users) {
    return new Promise((resolve, reject) => {
      if (users.length > 0) {
        fill(users[0])
          .then(() => {
            if (users.length > 0) {
              queue_rows(users.slice(1, users.length)).then(resolve);
            }
          });
      } else {
        resolve();
      }
    })
  }

  function fill(user, isLast) {
    let row = new video_row(user.channel.display_name, null, { username: user.channel.name, limit: 10});
    return new Promise((resolve, reject) => {
      api.get_user_videos(user.channel.name, 10)
        .then((response) => {
          if (response.videos.length > 0) {
            row.push(response.videos);
            document.querySelector('#videos').appendChild(row.element);
          }
          resolve();
        });
    })
  }
});
