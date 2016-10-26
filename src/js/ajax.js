class ajax {
  constructor() {
    this.request;
  }

  get(url, parseJSON, headers) {
    return new Promise((resolve, reject) => {
      this.request = new XMLHttpRequest();
      this.request.open('GET', url, true);

      if (headers) {
        Object.keys(headers)
          .forEach(key => {
            this.request.setRequestHeader(key, headers[key])
          })
      }

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
