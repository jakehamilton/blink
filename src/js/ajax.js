/**
 * @class ajax
 * @description Performs HTTP requests
 */
class ajax {
  /**
   * @constructor
   */
  constructor() {
    /**
     * @member {XMLHttpRequest} request The request being made
     */
    this.request;
  }

  /**
   * @method get
   * @description Performs a `get` request to a given endpoint
   * @param {String} url The url to request
   * @param [Bool=false] parseJSON Whether or not to parse the response before resolution
   * @param [Object] headers A map of headers to send
   * 
   * @promise
   * @resolve {Object|String} response The response from the server
   * @reject {Error} err The error that occurred
   * 
   * @example
   * let http = new ajax()
   * 
   * http.get('example.com')
   *   .then(response => ...)
   */
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
