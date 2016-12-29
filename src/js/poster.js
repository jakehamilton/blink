/**
 * @class poster
 * @description A single video poster component
 */
class poster {
  /**
   * @constructor
   * @param {Object} game A game video object from the Twitch API to laod
   */
  constructor(game) {
    /**
     * @member poster
     * @description The base DOM node for the component
     */
    this.poster = document.importNode(document.querySelector('#poster-template').content, true);

    // If this is a stream, then use the channel's banner and name if available
    if (game.type == 'stream') {
      game.thumbnail = game.channel.profile_banner || game.channel.logo || '';
      game.name = game.channel.display_name || game.channel.name;
    }

    // Populate the thumbnail and title
    this.poster.querySelector('.video__image').src = game.thumbnail;
    this.poster.querySelector('.video__title').innerText = game.name.length > 16 ? game.name.substr(0, 16) + '...' : game.name;
  }

  /**
   * @get element
   * @description Returns the base DOM element of the component
   * 
   * @return {HTMLElement} slide The base DOM element of the component
   */
  get element() {
    return this.poster;
  }
}

export default poster;
