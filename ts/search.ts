import {Component, View, Inject, NgFor, formDirectives} from 'angular2/angular2';
import {Vec2, Node, Feature, World, WorldUpdate} from './world';

class PathSegment {
    constructor(private mode: string, private type: string, public text?: string) { }
}
class PathNode extends PathSegment {
    constructor(node: Node) {
        super('node', node.type, node.name);
    }
}
class PathEdge extends PathSegment {
    constructor(n1: Node, n2: Node) {
        super('edge', n1.type === n2.type ? n1.type : (n2.type === 'mark' ? n2.type : 'walk'));
    }
}

@Component({ selector: 'search' })
@View({
    templateUrl: 'search.html',
    directives: [NgFor, formDirectives]
})
export class SearchComponent {
    private path: PathSegment[];

    constructor( @Inject(World) private world: World) {
        world.addListener(reason => {
            if (reason === WorldUpdate.PathUpdated)
                this.updatePath();
        });
    }

    private updatePath() {
        var path = this.world.path;
        this.path = [];
        if (path != null && path.length > 1) {
            var n1 = path[0];
            this.path.push(new PathNode(n1));
            for (var i = 1; i < path.length; i++) {
                var n2 = path[i];
                this.path.push(new PathEdge(n1, n2));
                this.path.push(new PathNode(n2));
                n1 = n2;
            }
        }
    }

    private search(loc, dest) {
        var locNode = this.world.findNode(loc);
        var destNode = this.world.findNode(dest);
        if (locNode !== null && destNode !== null) {
            this.world.context = "source";
            this.world.contextClick(locNode.pos.x, locNode.pos.y);
            this.world.context = "destination";
            this.world.contextClick(destNode.pos.x, destNode.pos.y);
        }
    }
}