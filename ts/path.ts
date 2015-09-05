/// <reference path="_refs.ts"/>
module Tesp {
    export interface IPathEdge {
        target: IPathNode;
        cost: number;
        type: string;
    }
    export interface IPathNode {
        node: INode;
        dist: number;
        prev: IPathNode;
        prevEdge: IPathEdge;
        edges: IPathEdge[];
    }

    export interface IPathWorkerData {
        nodes: INode[];
        areas: IArea[];
        source: INode;
        destination: INode;
        mark: INode;
        features: IFeatureList;
    }
    /** Calculates the best path in the current context */
    export class Path {
        private worker: Worker;
        private working: Promise<IPathNode>;
        private queue: Promise<IPathNode>;

        constructor(private app: Application) {
            this.app.addChangeListener(ChangeReason.ContextChange | ChangeReason.MarkChange | ChangeReason.FeatureChange, () => {
                this.findPath();
            });
        }

        private findPath(): Promise<IPathNode> {
            if (this.queue) {
                return this.queue;
            }
            if (this.working) {
                return this.queue = <Promise<IPathNode>><any>this.working.then(() => this.findPath());
            }

            var context = this.app.context;
            var source = context.sourceNode;
            var destination = context.destNode;
            if (source == null || destination == null || source === destination) {
                this.app.triggerChange(ChangeReason.PathUpdate);
                return Promise.reject(new Error("Invalid source and destination configuration"));
            }

            var world = this.app.world;
            var data: IPathWorkerData = {
                nodes: world.nodes,
                areas: world.areas,
                source: source,
                destination: destination,
                mark: context.markNode,
                features: this.app.features
            };

            return this.working = new Promise<IPathNode>((resolve, reject) => {
                if (this.worker == null) {
                    this.worker = new Worker("js/path.worker.js");
                }

                this.worker.onmessage = ev => {
                    this.queue = this.working = null;
                    this.app.triggerChange(ChangeReason.PathUpdate, ev.data);
                    resolve(ev.data);
                };
                this.worker.onerror = ev => {
                    this.queue = this.working = null;
                    this.app.triggerChange(ChangeReason.PathUpdate);
                    reject(ev);
                };
                this.worker.postMessage(data);
            });
        }
    }
}