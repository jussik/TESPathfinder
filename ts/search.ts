import {Component, View, Inject, NgFor} from 'angular2/angular2';
import {Vec2, World} from 'world';

@Component({ selector: 'search' })
@View({
    templateUrl: 'search.html',
    directives: [NgFor]
})
export class SearchComponent {
    constructor( @Inject(World) private world: World) { }

    private search(loc, dest) {
        console.log("SEARCH", loc, dest);
        var locNode = this.world.findNode(loc);
        var destNode = this.world.findNode(dest);
        if (locNode !== null && destNode !== null) {
            console.log(locNode.name, destNode.name);
        }
    }
}