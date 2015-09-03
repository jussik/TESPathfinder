module Tesp {
    /** Manages the context menu of the map */
    export class ContextMenu {
        private menu: Menu;
        private links: MenuItem[];
        private unmarkLink: MenuItem;

        private pos: Vec2;
        private node: Node;

        constructor(private app: Application) {
            this.menu = new Menu(app, false);

            this.links = [
                MenuItem.separator,
                new MenuItem("Navigate from here", () => this.setContext("source")),
                new MenuItem("Navigate to here", () => this.setContext("destination")),
                new MenuItem("Set Mark here", () => this.setContext("mark"))
            ];
            this.unmarkLink = new MenuItem("Remove mark", () => this.app.context.clearContext("mark"));
        }

        private setContext(context: string) {
            if (this.node != null) {
                this.app.context.setContextNode(context, this.node);
            } else {
                this.app.context.setContextLocation(context, this.pos);
            }
        }

        openNode(node: Node) {
            this.open(node.pos, node);
        }
        open(pos: Vec2, node: Node) {
            // remove node if neither it or its reference are permanent
            if (node != null && !node.permanent) {
                if (node.referenceId == null) {
                    node = null;
                } else {
                    node = this.app.world.findNodeById(node.referenceId);
                    if (node != null && !node.permanent) {
                        node = null;
                    }
                }
            }

            var lines: string[] = [];
            var landmark = this.app.world.getLandmarkName(pos);
            if (node != null) {
                var feat = this.app.features.byName[node.type];
                if (feat != null) {
                    lines.push(feat.location || feat.name);
                    lines.push(node.name);
                } else {
                    lines.push(node.longName);
                }
                if (landmark != null && landmark !== node.name) {
                    lines.push(landmark);
                }
                pos = node.pos;
            } else if (landmark != null) {
                lines.push(landmark);
            }
            var region = this.app.world.getRegionName(pos);
            if (region != null) {
                lines.push(region + " Region");
            }

            this.pos = pos;
            this.node = node;

            var items = lines.map(l => new MenuItem(l)).concat(this.links);
            if (this.app.context.markNode != null)
                items.push(this.unmarkLink);
            this.menu.setData(items);
            this.menu.open();

            var menuStyle = this.menu.getStyle();
            menuStyle.left = pos.x + "px";
            menuStyle.top = pos.y + "px";

            var scrollX = pageXOffset;
            var scrollY = pageYOffset;
            var rect = this.menu.element.getBoundingClientRect();
            if (rect.left < 10) {
                scrollX = pageXOffset + rect.left - 10;
            } else if (rect.right > innerWidth - 27) {
                scrollX = pageXOffset + rect.right - innerWidth + 27;
            }

            if (rect.top < 50) {
                scrollY = pageYOffset + rect.top - 50;
            } else if (rect.bottom > innerHeight - 27) {
                scrollY = pageYOffset + rect.bottom - innerHeight + 27;
            }

            if (scrollX !== pageXOffset || scrollY !== pageYOffset)
                scroll(scrollX, scrollY);
        }
        hide() {
            this.menu.hide();
        }
    }
}