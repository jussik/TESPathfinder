export class Vec2 {
    x: number;
    y: number;
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
}

export class Node {
    id: number;
    pos: Vec2;
    edges: Edge[];

    private static identity: number = 1;
    constructor(public name: string, x: number, y: number, public type: string) {
        this.id = Node.identity++;
        this.pos = new Vec2(x, y);
        this.edges = [];
    }
}

export class Edge {
    constructor(public srcNode: Node, public destNode: Node) { }
}

export interface WorldListener { (): void; }

export class World {
    nodes: Node[] = [];
    edges: Edge[] = [];
    activeNode: Node;

    private listeners: WorldListener[] = [];
    private nodesByName: Map<string, Node> = {};

    load(data: any) {
        this.activeNode = null;

        // mages guild
        this.nodes = data.magesGuild.map(n => new Node(n.name, n.x, n.y, "mages-guild"));
        this.edges = [];
        var len = this.nodes.length;
        for (var i = 0; i < len - 1; i++) {
            var n1: Node = this.nodes[i];
            for (var j = i + 1; j < len; j++) {
                var n2: Node = this.nodes[j];
                var edge = new Edge(n1, n2);
                n1.edges.push(edge);
                n2.edges.push(edge);
                this.edges.push(edge);
            }
        }

        // silt strider
        var striderNodes: Node[] = data.siltStrider.map(n => new Node(n.name, n.x, n.y, "silt-strider"));
        this.nodes = this.nodes.concat(striderNodes);
        data.siltStrider.forEach((n, i1) => {
            if (n.edges) {
                var n1 = striderNodes[i1];
                n.edges.forEach(i2 => {
                    var n2 = striderNodes[i2];
                    var edge = new Edge(n1, n2);
                    n1.edges.push(edge);
                    n2.edges.push(edge);
                    this.edges.push(edge);
                });
            }
        });

        // index by name
        this.nodesByName = {};
        this.nodes.forEach(n => this.nodesByName[n.name.toLowerCase()] = n);

        this.onchange();
    }

    addListener(listener: WorldListener) {
        this.listeners.push(listener);
    }

    findNode(name: string): Node {
        return this.nodesByName[name.toLowerCase()] || null;
    }
    findPath(loc: Node, dest: Node) {
        return "Path between " + loc.name + " and " + dest.name;
    }

    click(x: number, y: number) {
        if (this.activeNode != null) {
            this.activeNode.pos = new Vec2(x, y);
        } else {
            this.activeNode = new Node("You", x, y, "from");
            this.nodes.push(this.activeNode);
            this.sortnodes();
        }

        this.onchange();
    }

    private sortnodes() {
        this.nodes.sort((a, b) => a.id - b.id);
    }
    private onchange() {
        this.listeners.forEach(fn => fn());
    }
}