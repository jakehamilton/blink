import poster from './poster.js';

// Constructs a row of video elements
class video_row {
  constructor(name, initial_videos, data) {
    this.videos = [];
    this.data = data || false;

    // Construct the element from a template
    this.row = document.importNode(document.querySelector('#row-template').content, true);
    this.row.querySelector('.title').innerText = name;
    this.wrapper = this.row.querySelector('.videos');

    // Some setup
    // Track the section of videos visible on screen
    this.section = 0;
    // The width of each video element
    this.video_width = 315;
    // The total sections loaded
    this.total_sections = 0;

    // Cache important DOM nodes
    this.videos_mask = this.row.querySelector('.videos__mask');
    this.control_left = this.row.querySelector('.row-control--left');
    this.control_right = this.row.querySelector('.row-control--right');

    // Navigate the row left by translating it
    this.control_left.addEventListener('click', (event) => {
      if (this.section > 0) {
        this.section--;
        // `translate3d` for graphics acceleration if available
        this.videos_mask.style.transform = 'translate3d(' + ((this.video_width * (window.innerWidth / this.video_width)) * -this.section) + 'px, 0, 0)';
      }
      video_row.prototype.navigation_callback({ direction: 'left' , section: this.section, total_sections: this.total_sections, row: this, data: this.data, videos: this.videos.length});
    });
    // Navigate the row right
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

  // Assign callbacks to _EVERY_ instance
  static set_video_click_callback(fn) {
    video_row.prototype.video_click_callback = fn;
  }

  static set_navigation_callback(fn) {
    video_row.prototype.navigation_callback = fn;
  }

  // Add a video (or videos) to the row
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

    // Calculate the total number of sections loaded
    this.total_sections = this.wrapper.offsetWidth / ((this.video_width * (window.innerWidth / this.video_width)));
  }

  // Returns the row element
  get element() {
    return this.row;
  }
}

export default video_row;
