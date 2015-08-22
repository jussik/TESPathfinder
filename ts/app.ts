/// <reference path="d/whatwg-fetch/whatwg-fetch.d.ts" />
/// <reference path="world.ts" />
/// <reference path="search.ts" />
/// <reference path="map.ts" />

module tesp {
    class App {
        constructor() {
            window.fetch("data/data.json").then(res =>
                res.json().then(data => {
                    var world = new World(data);
                    new MapComponent(world, document.getElementById("map"));
                    new SearchComponent(world, document.getElementById("search"));
                    document.body.classList.remove("loading");
                }));
        }
    }

    new App();
}