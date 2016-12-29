# Blink
A Netflix-style Twitch app

# Preview
![Blink Preview 1](/screenshots/screenshot-1.png)
![Blink Preview 2](/screenshots/screenshot-2.png)

# A few words
It should be known that this project has some issues. For instance, naming convenctions
are pretty darn weird. I used this project to learn quite a bit and to also play with/challenge
common practices. Hence why this project uses underscord\_lower\_case everywhere. Don't think
that I actually still do this, it was a one time thing!

# Contributing
This project still has a way to go.
If you want to pitch in, here are a few things you can work on in no particular order:

+ Performance
  - [ ] Only load 3-4 video rows at a time instead of every subscription
  - [ ] Simplify the Promise logic (Currently creating unnecessary promises)
+ Features
  - [ ] Load top Twitch streams in the hero banner
  - [ ] Actually rotate the banner images
  - [ ] Fix (or remove) the "subscribe" button on the hero banner
  - [ ] No longer cap subscription retrieval at 100
  - [ ] Mobile styles

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
