/// <reference path="../_refs.ts"/>
module Tesp {
    class PathEdge implements IPathEdge {
        constructor(public target: PathNode, public cost: number, public type: string) { }
    }
    class PathNode implements IPathNode {
        dist: number;
        prev: PathNode;
        prevEdge: PathEdge;
        edges: PathEdge[];

        constructor(public node: INode) {
            this.dist = Infinity;
        }
    }

    importScripts("common.js");

    onmessage = ev => {
        var data: IPathWorkerData = ev.data;
        var spellCost = 5;

        // create nodes
        var nodeMap: { [key: number]: PathNode } = {};
        var feats = data.features.byName;
        var nodes: PathNode[] = data.nodes
            .filter(n => !feats[n.type].disabled && n !== data.source && n !== data.destination)
            .map(n => nodeMap[n.id] = new PathNode(n));

        var source = new PathNode(data.source);
        source.dist = 0;
        nodes.push(source);
        nodeMap[data.source.id] = source;

        var dest = new PathNode(data.destination);
        nodes.push(dest);
        nodeMap[data.destination.id] = dest;

        var maxCost = Vec2.distance(data.source.pos, data.destination.pos);

        // explicit edges (services)
        nodes.forEach(n =>
            n.edges = n.node.edges
                .filter(e => !feats[e.destNode.type].disabled)
                .map(e => new PathEdge(nodeMap[(e.srcNode === n.node ? e.destNode : e.srcNode).id], e.cost, n.node.type)));

        // implicit edges (walking)
        nodes.forEach(n =>
            n.edges = n.edges.concat(nodes
                .filter(n2 => n2 !== n && !n.edges.some(e => e.target === n2))
                .map(n2 => new PathEdge(n2, Vec2.distance(n.node.pos, n2.node.pos), "walk"))
                .filter(e => e.cost <= maxCost)));

        // mark
        if (data.mark != null && !feats["mark"].disabled) {
            var mn = new PathNode(data.mark);
            mn.edges = nodes.filter(n => n !== source)
                .map(n => new PathEdge(n, Vec2.distance(mn.node.pos, n.node.pos), "walk"))
                .filter(e => e.cost < maxCost);
            source.edges.push(new PathEdge(mn, spellCost, "mark"));
            nodes.push(mn);
        }

        // intervention
        nodes.forEach(n => {
            var cell = Cell.fromPosition(n.node.pos);
            data.areas.forEach(a => {
                if (!feats[a.target.type].disabled) {
                    if (Area.containsCell(a, cell)) {
                        // node inside area, teleport to temple/shrine
                        n.edges.push(new PathEdge(nodeMap[a.target.id], spellCost, a.target.type));
                    } else {
                        // node outside area, walk to edge
                        var dist: number = Infinity;
                        var closest: Vec2;
                        a.rows.forEach(r => {
                            // v is closest point (in cell units) from node to row
                            var v = new Vec2(
                                Math.max(Math.min(cell.x, r.x1 + r.width), r.x1),
                                Math.max(Math.min(cell.y, r.y + 1), r.y));
                            var alt = Vec2.distance(cell, v);
                            if (alt < dist) {
                                dist = alt;
                                closest = v;
                            }
                        });
                        var pos = Vec2.fromCell(closest.x, closest.y);
                        var cost = Vec2.distance(n.node.pos, pos);
                        if (cost < maxCost) {
                            // new node to allow us to teleport once we're in the area
                            var feat = data.features.byName[a.target.type];
                            var name = `${feat.name} range of ${a.target.name}`;
                            var an = new PathNode(new Node(name, name, pos, "area"));
                            an.edges = [new PathEdge(nodeMap[a.target.id], spellCost, a.target.type)];
                            nodes.push(an);
                            n.edges.push(new PathEdge(an, cost, "walk"));
                        }
                    }
                }
            });
        });

        var q: PathNode[] = nodes.slice();
        var overhead = data.features.nodeOverhead;

        while (q.length > 0) {
            q.sort((a, b) => b.dist - a.dist);
            var u = q.pop();

            for (var i = 0; i < u.edges.length; i++) {
                var e = u.edges[i];
                var v = e.target;
                var alt = u.dist + e.cost + overhead;
                if (alt < v.dist) {
                    v.dist = alt;
                    v.prev = u;
                    v.prevEdge = e;
                }
            }
        }

        // lib.d.ts does not have window.postMessage(message)
        (<Worker><any>self).postMessage(dest);
    }
}