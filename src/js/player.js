class player {
  constructor(id) {
    this.id = id;
    this.player;

    window.addEventListener('resize', (event) => {
      if (this.player) {
        let i = document.querySelector('iframe');
        i.width = window.innerWidth;
        i.height = window.innerHeight;
      }
    });
  }

  load(options = {video, channel}) {
    let config = {
      width: window.innerWidth,
      height: window.innerHeight
    };
    if (options.video) config.video = options.video;
    if (options.channel) config.channel = options.channel;

    this.player = new Twitch.Player(this.id, config);
  }

  play() {
    this.player.play();
  }

  pause() {
    this.player.pause();
  }

  destroy() {
    this.player = '';
    document.getElementById(this.id).innerHTML = '';
  }
}

export default player;
