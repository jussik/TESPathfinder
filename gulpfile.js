/// <binding Clean='clean' ProjectOpened='watch, server' />
var gulp = require("gulp");
var bower = require("gulp-bower");
var less = require("gulp-less");
var maps = require("gulp-sourcemaps");
var mincss = require("gulp-minify-css");
var concat = require("gulp-concat");
var ts = require("gulp-typescript");
var uglify = require("gulp-uglify");
var rename = require("gulp-rename");
var del = require("del");
var util = require("gulp-util");
var server = require("gulp-webserver");
var reload = require("gulp-livereload");
var flatten = require("gulp-flatten");
var yaml = require("gulp-yaml");
var open = require("open");
var merge = require("merge-stream");

gulp.task("default", ["less", "ts", "ts:workers", "libs", "data"]);

gulp.task("watch", function() {
    reload.listen();
    gulp.watch("ts/*", ["ts"]);
    gulp.watch(["ts/common.ts", "ts/workers/*.ts"], ["ts:workers"]);
    gulp.watch("less/*", ["less"]);
    gulp.watch("data.yml", ["data"]);
    gulp.watch("index.html", function (w) {
        return gulp.src(w.path).pipe(reload());
    });
});

gulp.task("server", function () {
    gulp.src(".").pipe(server());
});
gulp.task("open", function () {
    open("http://localhost:8000");
});

gulp.task("less", function () {
    return gulp.src("less/*.less")
        .pipe(maps.init())
        .pipe(less())
        .on("error", function(err) {
            util.log('Error:', util.colors.red(err.message));
            this.emit("end");
        })
        .pipe(concat("all.css"))
        .pipe(mincss())
        .pipe(maps.write(".", { sourceRoot: "../less" }))
        .pipe(gulp.dest("css"))
        .pipe(reload());
});

gulp.task("ts", function() {
    return gulp.src("ts/*.ts")
        .pipe(maps.init())
        .pipe(ts({
            out: "ts.js",
            noImplicitAny: true,
            target: "es5",
            removeComments: true,
            noEmitOnError: true
        })).js
        .pipe(maps.write({ sourceRoot: "../ts" }))
        .pipe(gulp.dest("js")) // write ts.js with inline source map
        .pipe(maps.init({ loadMaps: true }))
        .pipe(uglify({ mangle: false })) // mangle breaks debugging in chrome
        .pipe(rename("all.js"))
        .pipe(maps.write(".", { sourceRoot: "." }))
        .pipe(gulp.dest("js")) // write all.js and all.js.map
        .pipe(reload());
});
gulp.task("ts:workers", function() {
    return gulp.src(["ts/common.ts", "ts/workers/*.ts"], { base: "ts" })
        .pipe(maps.init())
        .pipe(ts({
            noImplicitAny: true,
            target: "es5",
            removeComments: true,
            noEmitOnError: true
        })).js
        .pipe(uglify({ mangle: false })) // mangle breaks debugging in chrome
        .pipe(flatten())
        .pipe(maps.write(".", { sourceRoot: "../ts" }))
        .pipe(gulp.dest("js"))
        .pipe(reload());
});

function copy(root, obj) {
    var stream = merge();
    for (var key in obj) {
        var target = obj[key];
        var path = root + "/" + key;
        stream.add(typeof (target) === "string"
            ? gulp.src(path).pipe(gulp.dest(target))
            : copy(path, target));
    }
    return stream;
}
gulp.task("libs", ["bower"], function () {
    return copy("bower_components", {
        "font-awesome": {
            "css/font-awesome.min.css": "lib/css",
            "fonts/*": "lib/fonts"
        },
        "es6-promise/promise.min.js": "lib",
        "fetch/fetch.js": "lib"
    });
});
gulp.task("bower", function() {
    return bower();
});

gulp.task("data", function() {
    return gulp.src("data.yml")
        .pipe(yaml())
        .pipe(gulp.dest("data"))
        .pipe(reload());
});

gulp.task("clean:js", function() {
    return del("js");
});
gulp.task("clean:css", function() {
    return del("css");
});
gulp.task("clean:libs", function() {
    return del(["lib", "bower_components"]);
});
gulp.task("clean:data", function() {
    return del("data");
})
gulp.task("clean", ["clean:js", "clean:css", "clean:libs", "clean:data"]);