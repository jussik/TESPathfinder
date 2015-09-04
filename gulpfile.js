var gulp = require("gulp");
var less = require("gulp-less");
var maps = require("gulp-sourcemaps");
var mincss = require("gulp-minify-css");
var concat = require("gulp-concat");
var ts = require("gulp-typescript");
var uglify = require("gulp-uglify");
var del = require("del");

gulp.task("default", ["less", "ts"]);

gulp.task("watch", function() {
    gulp.watch("ts/*", function() {
        gulp.run("ts");
    });
    gulp.watch("less/*", function() {
        gulp.run("less");
    });
});

gulp.task("less", ["clean:css"], function () {
    return gulp.src("less/*.less")
        .pipe(maps.init())
        .pipe(less())
        .pipe(mincss())
        .pipe(concat("all.css"))
        .pipe(maps.write(".", { sourceRoot: "../less" }))
        .pipe(gulp.dest("css"));
});

gulp.task("ts", ["clean:js"], function() {
    return gulp.src("ts/*.ts")
        .pipe(maps.init())
        .pipe(ts({
            out: "all.js",
            noImplicitAny: true,
            target: "es5",
            removeComments: true
        })).js
        .pipe(uglify({ mangle: true }))
        .pipe(maps.write(".", { sourceRoot: "../ts" }))
        .pipe(gulp.dest("js"));
});

gulp.task("clean:js", function() {
    return del("js");
});
gulp.task("clean:css", function() {
    return del("css");
});
gulp.task("clean", ["clean:js", "clean:css"]);