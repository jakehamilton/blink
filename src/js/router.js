class router {
  constructor(routes = {}) {
    this.routes = routes;
    this.active_route;
  }

  route(name) {
    if (this.active_route) this.active_route.classList.remove('visible');
    this.active_route = this.routes[name];
    this.routes[name].classList.add('visible');
  }

  add_route(route) {
    if (Array.isArray(route)) {
      route.forEach((r) => {
        this.add_route(r);
      });
      return;
    }

    let keys = Object.keys(route);
    this.routes[keys[0]] = route[keys[0]];
    console.log(this.routes[keys[0]]);
  }
}

export default router;
