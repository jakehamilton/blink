import poster from './poster.js';

/**
 * @class video_row
 * @description The video row component, constructs a video row
 */
class video_row {
  /**
   * @constructor
   * @param {String} name The name of the row
   * @param [Array] initial_videos An array of video objects to add
   * @param [Any=false] data An optional data object
   */
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

    // Append the videos we were given
    if (initial_videos) {
      this.push(initial_videos);
    }
  }

  /**
   * @static
   * @method set_video_click_callback
   * @description Assign a callback to be run when a user clicks on a video poster
   * @param {Function} fn The function callback
   * 
   * @void
   */
  static set_video_click_callback(fn) {
    video_row.prototype.video_click_callback = fn;
  }

  /**
   * @static
   * @method set_navigation_callback
   * @description Assign a callback to be run when a user navigates left or right in the row
   * @param {Function} fn The function callback
   * 
   * @void
   */
  static set_navigation_callback(fn) {
    video_row.prototype.navigation_callback = fn;
  }

  // Add a video (or videos) to the row
  /**
   * @method push
   * @description Add a video (or videos) to the row
   * @param {Object|Array<Object>} video The video(s) to add
   * 
   * @void
   */
  push(video) {
    // If we got an array, then call push for each item
    if (Array.isArray(video)) {
      video.forEach((v) => {
        this.push(v);
      });
      return;
    }
    
    // Create a brand new poster for each video
    let element = new poster(video).element;

    // Register our click handler
    element.querySelector('.video').addEventListener('click', () => {
      video_row.prototype.video_click_callback(video);
    });
    this.videos.push(video);
    this.wrapper.appendChild(element);

    // Calculate the total number of sections loaded
    this.total_sections = this.wrapper.offsetWidth / ((this.video_width * (window.innerWidth / this.video_width)));
  }

  /**
   * @get element
   * @description Returns the base DOM element of the component
   * 
   * @return {HTMLElement} slide The base DOM element of the component
   */
  get element() {
    return this.row;
  }
}

export default video_row;
