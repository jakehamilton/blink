/**
 * @class player
 * @description A wrapper for the official Twitch player
 */
class player {
  /**
   * @constructor
   * @param {String} id The id of the element to mount
   */
  constructor(id) {
    /**
     * @member {String} id The id of the element which the player is mounted on
     */
    this.id = id;

    /**
     * @member {Object} player The Twitch player instance
     */
    this.player;

    // Resize the player if necessary
    window.addEventListener('resize', (event) => {
      if (this.player) {
        let i = document.querySelector('iframe');
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
  load(options = {video, channel}) {
    let config = {
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
  play() {
    this.player.play();
  }

  /**
   * @method pause
   * @description Pauses the player
   * 
   * @void
   */
  pause() {
    this.player.pause();
  }

  /**
   * @method destroy
   * @description Destroys the player instance and removes it from the page
   * 
   * @void
   */
  destroy() {
    this.player = '';
    document.getElementById(this.id).innerHTML = '';
  }
}

export default player;
