class ajax {
  constructor() {
    this.request;
  }

  get(url, parseJSON) {
    return new Promise((resolve, reject) => {
      this.request = new XMLHttpRequest();
      this.request.open('GET', url, true);
      this.request.addEventListener('load', () => {
        resolve(parseJSON ? JSON.parse(this.request.response) : this.request.response);
      });
      this.request.addEventListener('error', () => {
        reject('Failed to communicate with server at url: ' + url);
      });
      this.request.send();
    });
  }
}

export default ajax;
