// Handles ajax calls
class ajax {
  constructor() {
    this.request;
  }

  // Makes get requests
  get(url, parseJSON, headers) {
    return new Promise((resolve, reject) => {
      this.request = new XMLHttpRequest();
      this.request.open('GET', url, true);

      // Append headers if they were passed
      if (headers) {
        Object.keys(headers)
          .forEach(key => {
            this.request.setRequestHeader(key, headers[key])
          })
      }

      // When the request finishes, resolve with the response
      this.request.addEventListener('load', () => {
        resolve(parseJSON ? JSON.parse(this.request.response) : this.request.response);
      });

      // Or reject with an error
      this.request.addEventListener('error', () => {
        reject('Failed to communicate with server at url: ' + url);
      });

      // Send the response
      this.request.send();
    });
  }
}

export default ajax;
