﻿/// <reference path="_refs.ts"/>
module Tesp {
    /** The current mutable state of the application */
    export class Context {
        sourceNode: INode;
        destNode: INode;
        markNode: INode;

        constructor(private app: Application) {
            this.app.addChangeListener(ChangeReason.MarkChange, () => {
                this.app.toggleBodyClass("has-mark", this.markNode != null);
            });
        }

        setContextLocation(context: string, pos: IVec2) {
            var name = this.app.world.getLandmarkName(pos) || this.app.world.getRegionName(pos);
            if (context === "source") {
                name = name || "You";
                this.setContextNode(context, new Node(name, name, pos, "source"));
            } else if (context === "destination") {
                name = name || "Your destination";
                this.setContextNode(context, new Node(name, name, pos, "destination"));
            } else if (context === "mark") {
                this.markNode = new Node(name, name, pos, "mark");
                this.app.triggerChange(ChangeReason.MarkChange);
            }
        }
        setContextNode(context: string, node: INode) {
            if (context === "source") {
                this.sourceNode = node;
                this.app.triggerChange(ChangeReason.SourceChange);
            } else if (context === "destination") {
                this.destNode = node;
                this.app.triggerChange(ChangeReason.DestinationChange);
            } else if (context === "mark") {
                var pos = node.pos;
                this.markNode = new Node(node.longName, node.longName, pos, "mark");
                this.markNode.referenceId = node.referenceId || node.id;
                this.app.triggerChange(ChangeReason.MarkChange);
            }
        }
        clearContext(context: string) {
            if (context === "source") {
                this.sourceNode = null;
                this.app.triggerChange(ChangeReason.SourceChange);
            } else if (context === "destination") {
                this.destNode = null;
                this.app.triggerChange(ChangeReason.DestinationChange);
            } else if (context === "mark") {
                this.markNode = null;
                this.app.triggerChange(ChangeReason.MarkChange);
            }
        }
    }
}