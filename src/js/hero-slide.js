/**
 * @class slide
 * @description An individual hero slide
 */
class slide {
  /**
   * @constructor
   */
  constructor(stream) {
    /**
     * @member slide
     * @description The base DOM element of the component
     */
    this.slide = document.importNode(document.querySelector('#hero-template').content, true);

    // Attempt to find an image for the video
    this.slide.querySelector('.slide__image').src = stream.channel.profile_banner ||
                                                    stream.channel.video_banner ||
                                                    stream.channel.logo;

    // Populate the content
    this.slide.querySelector('.slide__content__channel').innerText = stream.channel.display_name;
    this.slide.querySelector('.slide__content__description').innerText = stream.channel.status || "Streaming Live";

    // When a user clicks the "Watch Now" button, load the stream in the player
    this.slide.querySelector('.watch-now-button').addEventListener('click', (event) => {
      slide.prototype.watch_now_callback({
        name: stream.channel.name
      })
    });
  }

  /**
   * @static
   * @method set_watch_now_callback
   * @description Assigns a function as a callback for when a user clicks the "watch now" button
   * 
   * @void
   */
  static set_watch_now_callback(fn) {
    slide.prototype.watch_now_callback = fn;
  }

  /**
   * @get element
   * @description Returns the base DOM element of the component
   * 
   * @return {HTMLElement} slide The base DOM element of the component
   */
  get element() {
    return this.slide;
  }
}

export default slide;
