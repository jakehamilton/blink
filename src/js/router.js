/**
 * @class router
 * @description Handles routing for the application
 */
class router {
  /**
   * @constructor
   * @param [Object] routes A routes object to use for routing
   */
  constructor(routes = {}) {
    /**
     * @member {Object} routes
     * @description The map of routes available in the application
     */
    this.routes = routes;

    /**
     * @member {Object} active_route
     * @description The current, visible route
     */
    this.active_route;
  }

  /**
   * @method route
   * @description Changes the view to a new route
   * @param {String} name The route to switch to
   * 
   * @void
   */
  route(name) {
    if (this.active_route) this.active_route.classList.remove('visible');
    this.active_route = this.routes[name];
    this.routes[name].classList.add('visible');
  }

  /**
   * @method add_route
   * @description Adds a new route or multiple routes from an Array
   * @param {Object|Array<Object>} route The route(s) to add
   * 
   * @void
   */
  add_route(route) {
    if (Array.isArray(route)) {
      route.forEach((r) => {
        this.add_route(r);
      });
      return;
    }

    let keys = Object.keys(route);
    this.routes[keys[0]] = route[keys[0]];
  }
}

export default router;
