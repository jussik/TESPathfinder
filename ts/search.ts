import {Component, View, Inject} from 'angular2/angular2';
import {Vec2, World} from 'world';

@Component({ selector: 'search' })
@View({ templateUrl: 'search.html' })
export class SearchComponent {
    cursor: Vec2;

    constructor( @Inject(World) private world: World) {
        this.cursor = new Vec2(0, 0);
        document.addEventListener("mousemove", ev => {
            this.cursor.x = ev.pageX;
            this.cursor.y = ev.pageY;
        });
    }

    search(loc, dest) {
        console.log("SEARCH", loc, dest);
        var locNode = this.world.findNode(loc);
        var destNode = this.world.findNode(dest);
        if (locNode !== null && destNode !== null) {
            console.log(this.world.findPath(locNode, destNode));
        }
    }
}