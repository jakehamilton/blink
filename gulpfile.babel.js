
import gulp from 'gulp';
import sass from 'gulp-sass';
import jade from 'gulp-jade';
import watch from 'gulp-watch';
import batch from 'gulp-batch';
import source from 'vinyl-source-stream';
import plumber from 'gulp-plumber';
import babelify from 'babelify';
import browserify from 'browserify';
import sourcemaps from 'gulp-sourcemaps';
import browser_sync from 'browser-sync';

const bs = browser_sync.create();

gulp.task('serve', ['watch'], () => {
  bs.init({
    open: false,
    ghostMode: false,
    server: {
      baseDir: 'app'
    }
  });
});

gulp.task('watch', ['build'], () => {
  watch('src/scss/**/*.scss', batch((events, done) => {
    gulp.start('scss', done);
  }));
  watch('src/js/**/*.js', batch((events, done) => {
    gulp.start('js', done);
  }));
  watch('src/jade/**/*.jade', batch((events, done) => {
    gulp.start('jade', done);
  }));
});

gulp.task('build', ['scss', 'js', 'jade', 'fonts']);

gulp.task('scss', () => {
  gulp.src('src/scss/*.scss')
    .pipe(plumber())
    .pipe(sourcemaps.init())
    .pipe(sass())
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest('app/assets/css'))
    .pipe(bs.stream());
});

gulp.task('js', () => {
  let bundler = browserify({
    entries: 'src/js/app.js',
    debug: true
  })

  bundler.transform(babelify);

  bundler.bundle()
    .pipe(source('bundle.js'))
    .pipe(gulp.dest('app/assets/js/'));

  bs.reload();
});

gulp.task('jade', () => {
  gulp.src('src/jade/*.jade')
    .pipe(plumber())
    .pipe(sourcemaps.init())
    .pipe(jade())
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest('app/'));

  bs.reload();
});

gulp.task('fonts', () => {
  gulp.src('src/fonts/*.*')
    .pipe(gulp.src('app/assets/fonts'));
});

gulp.task('default', ['serve']);
