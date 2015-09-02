module Tesp {
    export class PathEdge {
        constructor(public target: PathNode, public cost: number, public type: string) { }
    }
    export class PathNode {
        dist: number;
        prev: PathNode;
        prevEdge: PathEdge;
        edges: PathEdge[];

        constructor(public node: Node) {
            this.dist = Infinity;
        }
    }

    export class Path {
        private static spellCost: number = 5;

        static findPath(app: Application) {
            var world = app.world;
            var context = app.context;

            // create nodes
            var nodeMap: { [key: number]: PathNode } = {};
            var feats = app.features.byName;
            var nodes: PathNode[] = world.nodes
                .filter(n => !feats[n.type].disabled && n !== context.sourceNode && n !== context.destNode)
                .map(n => nodeMap[n.id] = new PathNode(n));

            var source = new PathNode(context.sourceNode);
            source.dist = 0;
            nodes.push(source);
            nodeMap[context.sourceNode.id] = source;

            var dest = new PathNode(context.destNode);
            nodes.push(dest);
            nodeMap[context.destNode.id] = dest;

            var maxCost = context.sourceNode.pos.distance(context.destNode.pos);

            // explicit edges (services)
            nodes.forEach(n =>
                n.edges = n.node.edges
                    .filter(e => !feats[e.srcNode.type].disabled)
                    .map(e => new PathEdge(nodeMap[(e.srcNode === n.node ? e.destNode : e.srcNode).id], e.cost, n.node.type)));

            // implicit edges (walking)
            nodes.forEach(n =>
                n.edges = n.edges.concat(nodes
                    .filter(n2 => n2 !== n && !n.edges.some(e => e.target === n2))
                    .map(n2 => new PathEdge(n2, n.node.pos.distance(n2.node.pos), "walk"))
                    .filter(e => e.cost <= maxCost)));

            // mark
            if (context.markNode != null && !feats["mark"].disabled) {
                var mn = new PathNode(context.markNode);
                mn.edges = nodes.filter(n => n !== source)
                    .map(n => new PathEdge(n, mn.node.pos.distance(n.node.pos), "walk"))
                    .filter(e => e.cost < maxCost);
                source.edges.push(new PathEdge(mn, Path.spellCost, "mark"));
                nodes.push(mn);
            }

            // intervention
            nodes.forEach(n => {
                var cell = Cell.fromPosition(n.node.pos);
                world.areas.forEach(a => {
                    if (!feats[a.target.type].disabled) {
                        if (a.containsCell(cell)) {
                            // node inside area, teleport to temple/shrine
                            n.edges.push(new PathEdge(nodeMap[a.target.id], Path.spellCost, a.target.type));
                        } else {
                            // node outside area, walk to edge
                            var dist: number = Infinity;
                            var closest: Vec2;
                            a.rows.forEach(r => {
                                // v is closest point (in cell units) from node to row
                                var v = new Vec2(
                                    Math.max(Math.min(cell.x, r.x1 + r.width), r.x1),
                                    Math.max(Math.min(cell.y, r.y + 1), r.y));
                                var alt = cell.distance(v);
                                if (alt < dist) {
                                    dist = alt;
                                    closest = v;
                                }
                            });
                            var pos = Vec2.fromCell(closest.x, closest.y);
                            var cost = n.node.pos.distance(pos);
                            if (cost < maxCost) {
                                // new node to allow us to teleport once we're in the area
                                var feat = app.features.byName[a.target.type];
                                var name = `${feat.name} range of ${a.target.name}`;
                                var an = new PathNode(new Node(name, name, pos, "area"));
                                an.edges = [new PathEdge(nodeMap[a.target.id], Path.spellCost, a.target.type)];
                                nodes.push(an);
                                n.edges.push(new PathEdge(an, cost, "walk"));
                            }
                        }
                    }
                });
            });

            var q: PathNode[] = nodes.slice();

            while (q.length > 0) {
                q.sort((a, b) => b.dist - a.dist);
                var u = q.pop();

                for (var i = 0; i < u.edges.length; i++) {
                    var e = u.edges[i];
                    var v = e.target;
                    var alt = u.dist + e.cost;
                    if (alt < v.dist) {
                        v.dist = alt;
                        v.prev = u;
                        v.prevEdge = e;
                    }
                }
            }

            return dest;
        }
    }
}