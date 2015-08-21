import {Component, View, Inject, NgIf} from 'angular2/angular2';
import {Vec2, World} from 'world';

@Component({ selector: 'search' })
@View({ templateUrl: 'search.html' })
export class SearchComponent {
    private cursor: Vec2;

    constructor( @Inject(World) private world: World) {
        world.addListener(() => {
            if (world.activeNode != null) {
                this.cursor = world.activeNode.pos;
            }
        });
    }

    private search(loc, dest) {
        console.log("SEARCH", loc, dest);
        var locNode = this.world.findNode(loc);
        var destNode = this.world.findNode(dest);
        if (locNode !== null && destNode !== null) {
            console.log(this.world.findPath(locNode, destNode));
        }
    }
}