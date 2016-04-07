import poster from './poster.js';

class video_row {
  constructor(name, initial_videos, data) {
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

    this.control_left.addEventListener('click', (event) => {
      if (this.section > 0) {
        this.section--;
        this.videos_mask.style.transform = 'translate3d(' + ((this.video_width * (window.innerWidth / this.video_width)) * -this.section) + 'px, 0, 0)';
      }
      video_row.prototype.navigation_callback({ direction: 'left' , section: this.section, total_sections: this.total_sections, row: this, data: this.data, videos: this.videos.length});
    });
    this.control_right.addEventListener('click', (event) => {
      if (!((window.innerWidth * .7) * (this.section + 1) > this.wrapper.offsetWidth)) {
        this.section++;
        this.videos_mask.style.transform = 'translate3d(' + ((this.video_width * (window.innerWidth / this.video_width)) * -this.section) + 'px, 0, 0)';
      }
      video_row.prototype.navigation_callback({ direction: 'right' , section: this.section, total_sections: this.total_sections, row: this, data: this.data, videos: this.videos.length});
    });

    if (initial_videos) {
      this.push(initial_videos);
    }
  }

  static set_video_click_callback(fn) {
    video_row.prototype.video_click_callback = fn;
  }

  static set_navigation_callback(fn) {
    video_row.prototype.navigation_callback = fn;
  }

  push(video) {
    if (Array.isArray(video)) {
      video.forEach((v) => {
        this.push(v);
      });
      return;
    }
    
    let element = new poster(video).element;
    element.querySelector('.video').addEventListener('click', () => {
      video_row.prototype.video_click_callback(video);
    });
    this.videos.push(video);
    this.wrapper.appendChild(element);
    this.total_sections = this.wrapper.offsetWidth / ((this.video_width * (window.innerWidth / this.video_width)));
  }

  get element() {
    return this.row;
  }
}

export default video_row;
