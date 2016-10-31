# Blink
A Netflix-style Twitch app

# Preview
![Blink Preview 1](/screenshots/screenshot-1.png)
![Blink Preview 2](/screenshots/screenshot-2.png)

# Install
```bash
# Clone the repo
$ git clone https://github.com/jakehamilton/blink blink
# Enter the project directory and clone
$ cd $_ && npm install
```

# File Structure

```
blink/
|-- app/ (all built files)
|   |-- index.html (entry html file)
|   |-- assets/ (all resources)
|   |   |-- css/
|   |   |-- fonts/
|   |   |-- img/
|   |   |-- js/
|-- src/ (all source files)
|   |-- fonts/ (fonts to be used)
|   |-- jade/ (uncompiled jade)
|   |-- js/ (all JS files)
|   |-- scss/ (all sass files)
|-- .babelrc (babel config)
|-- .gitignore
|-- gulpfile.babel.js
|-- package.json
```

# Gulp tasks
If `gulp` is not globally installed, replace it with `./node_modules/gulp/bin/gulp.js` in these commands

```bash
# Build for production
$ gulp build
# Live reloading for development
$ gulp
```
