class slide {
  constructor(stream) {
    this.slide = document.importNode(document.querySelector('#hero-template').content, true);

    this.slide.querySelector('.slide__image').src = stream.channel.profile_banner ||
                                                             stream.channel.video_banner ||
                                                             stream.channel.logo;
    this.slide.querySelector('.slide__content__channel').innerText = stream.channel.display_name;
    this.slide.querySelector('.slide__content__description').innerText = stream.channel.status || "Streaming Live";
    this.slide.querySelector('.watch-now-button').addEventListener('click', (event) => {
      slide.prototype.watch_now_callback({
        name: stream.channel.name
      })
    });
  }

  static set_watch_now_callback(fn) {
    slide.prototype.watch_now_callback = fn;
  }

  get element() {
    return this.slide;
  }
}

export default slide;
