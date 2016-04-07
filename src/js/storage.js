class storage {
  constructor(namespace) {
    this.load_storage_map(namespace);
  }
  unique_id(size) {
    let alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890$&-_+';
    let id = '';
    for (var i = 0; i < size; i++) {
      id += alphabet[Math.floor(Math.random() * alphabet.length)];
    }

    Object.keys(this.storage_map).forEach((key) => {
      if (key === id) {
        return unique_id(size);
      }
    });

    return id;
  }
  save(name, data) {
    if (!this.storage_map[name]) {
      this.storage_map[name] = this.unique_id(5);
    }
    let key = this.storage_map[name];
    window.localStorage.setItem(`storage-${this.namespace}-${key}`, (typeof data == 'Object') ? JSON.stringify(data) : data);
    this.save_storage_map();
  }
  load(name) {
    return window.localStorage.getItem(`storage-${this.namespace}-${this.storage_map[name]}`) || false;
  }
  delete(name) {
    window.localStorage.removeItem(`storage-${this.namespace}-${this.storage_map[name]}`);
  }
  save_storage_map() {
    window.localStorage.setItem(`storage-${this.namespace}`, JSON.stringify(this.storage_map));
  }
  load_storage_map(namespace) {
    this.namespace = namespace;
    this.storage_map = JSON.parse(window.localStorage.getItem(`storage-${this.namespace}`) || '{}');
  }
}

export default storage;
