/// <reference path="typings/angular2/angular2.d.ts" />
import 'reflect-metadata';

import {Component, View, Inject, bootstrap} from 'angular2/angular2';
import {World} from './world';
import {MapComponent} from './map';
import {SearchComponent} from './search';

@Component({
    selector: 'app',
    bindings: [World]
})
@View({
    template: '<map></map><search></search>',
    directives: [MapComponent, SearchComponent]
})
class AppComponent {
    constructor(@Inject(World) world: World) {
        // TODO: Use angular's Http once it's available
        var req = new XMLHttpRequest();
        req.addEventListener('load', () => world.load(JSON.parse(req.responseText)));
        req.open("get", "data/data.json", true);
        req.send();
    }
}

bootstrap(AppComponent);