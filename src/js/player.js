// Wrapper for the Twitch player
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

  // Load a video or stream into the player
  load(options = {video, channel}) {
    let config = {
      width: window.innerWidth,
      height: window.innerHeight
    };
    if (options.video) config.video = options.video;
    if (options.channel) config.channel = options.channel;

    this.player = new Twitch.Player(this.id, config);
  }

  // Play the player
  play() {
    this.player.play();
  }

  // Pause the player
  pause() {
    this.player.pause();
  }

  // Destroy the player, removing the element and allowing the
  //  object to be garbage collected
  destroy() {
    this.player = '';
    document.getElementById(this.id).innerHTML = '';
  }
}

export default player;
