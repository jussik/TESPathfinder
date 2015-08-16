/// <reference path="typings/angular2/angular2.d.ts" />
import {Component, View, bootstrap} from 'angular2/angular2';

class Vec2 {
    x: number;
    y: number;
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
}

class Node {
    name: string;
    pos: Vec2;
    edges: Edge[];

    constructor(src: NodeSource) {
        this.name = src.name;
        this.pos = new Vec2(src.x, src.y);
        this.edges = [];
    }
}

enum NodeType {
    Location = 1,
    SiltStrider,
    Boat,
    Guild,
    Propylon,
    Mark,
    Divine,
    Almsivi
};

class Edge {
    type: NodeType;
    constructor(public node: Node, src: EdgeSource) {
        this.type = src.type;
    }
}

class NodeSource {
    name: string;
    x: number;
    y: number;
}
class EdgeSource {
    src: number;
    dest: number;
    type: NodeType;
}
class WorldSource {
    nodes: NodeSource[];
    edges: EdgeSource[];
}

class World {
    nodes: Node[];
    nodesByName: Map<string, Node>;

    load(data: WorldSource) {
        this.nodes = data.nodes.map(s => new Node(s));
        // index by name
        this.nodesByName = {};
        this.nodes.forEach(n => this.nodesByName[n.name.toLowerCase()] = n);
        // process edges
        data.edges.forEach(e => {
            var src = this.nodes[e.src],
                dest = this.nodes[e.dest];
            src.edges.push(new Edge(dest, e));
            dest.edges.push(new Edge(src, e));
        });
    }

    findNode(name: string): Node {
        return this.nodesByName[name.toLowerCase()] || null;
    }
    findPath(loc: Node, dest: Node) {
        return "Path between " + loc.name + " and " + dest.name;
    }
}

@Component({ selector: 'search' })
@View({
    template: `
        <div id="search">
            <input placeholder="Location" #loc (input) />
            &rarr;
            <input placeholder="Destination" #dest (input) />
            <button (click)="search(loc.value, dest.value)">Go</button>
        </div>`
})
class SearchComponent {
    static parameters = [[World]];
    constructor(private world: World) { }
    search(loc, dest) {
        console.log("SEARCH", loc, dest);
        var locNode = this.world.findNode(loc);
        var destNode = this.world.findNode(dest);
        if (locNode !== null && destNode !== null) {
            console.log(this.world.findPath(locNode, destNode));
        }
    }
}

@Component({
    selector: 'app',
    bindings: [World]
})
@View({
    template: '<search></search>',
    directives: [SearchComponent]
})
class AppComponent {
    static parameters = [[World]];
    constructor(world: World) {
        var data = {
            nodes: [
                { name: "Balmora" },
                { name: "Caldera" }
            ],
            edges: [
                { src: 0, dest: 1, type: 4 }
            ]
        };
        world.load(<WorldSource>data);
    }
}

bootstrap(AppComponent);