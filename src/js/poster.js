// A single video poster inside a video row
class poster {
  constructor(game) {
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

  // Retrieve the underlying element
  get element() {
    return this.poster;
  }
}

export default poster;
