// The hero banner slides (currently don't _slide_)
class slide {
  constructor(stream) {
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

  // Assign a callback
  static set_watch_now_callback(fn) {
    slide.prototype.watch_now_callback = fn;
  }

  // Get the underlying element
  get element() {
    return this.slide;
  }
}

export default slide;
