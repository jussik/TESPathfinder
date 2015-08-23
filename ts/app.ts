/// <reference path="d/whatwg-fetch/whatwg-fetch.d.ts" />
/// <reference path="world.ts" />
/// <reference path="controls.ts" />
/// <reference path="map.ts" />

module tesp {
    window.fetch("data/data.json").then(res =>
        res.json().then(data => {
            var world = new World(data);
            new Map(world, document.getElementById("map"));
            new Controls(world, document.getElementById("controls"));
            document.body.classList.remove("loading");
        }));
}