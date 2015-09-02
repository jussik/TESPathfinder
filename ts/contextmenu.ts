module Tesp {
    /** Manages the context menu of the map */
    export class ContextMenu {
        isOpen: boolean = false;

        constructor(private app: Application, private element: HTMLElement) {
            this.element.oncontextmenu = this.element.onmousedown = ev => ev.stopPropagation();
            this.element.onclick = ev => {
                ev.stopPropagation();
                var item = <HTMLElement>event.target;
                if (item.classList.contains("link")) {
                    var context = item.dataset["contextSet"];
                    if (context !== undefined) {
                        var data = this.element.dataset;
                        var nodeId = data["nodeId"];
                        var node: Node;
                        if (nodeId !== undefined && (node = this.app.world.findNodeById(+nodeId)) != null) {
                            this.app.context.setContextNode(context, node);
                        } else {
                            this.app.context.setContextLocation(context, new Vec2(+data["posX"], +data["posY"]));
                        }
                    } else {
                        context = item.dataset["contextUnset"];
                        if (context !== undefined) {
                            this.app.context.clearContext(context);
                        }
                    }
                    this.hide();
                }
            };
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

            var separator = this.element.getElementsByClassName("separator")[0];
            var child: Element;
            while ((child = this.element.firstElementChild) !== separator) {
                this.element.removeChild(child);
            }

            lines.forEach(l => {
                var item = document.createElement("li");
                item.textContent = l;
                this.element.insertBefore(item, separator);
            });

            this.element.style.left = pos.x + "px";
            this.element.style.top = pos.y + "px";

            var data = this.element.dataset;
            if (node != null) {
                data["nodeId"] = node.id + "";
                delete data["posX"];
                delete data["posY"];
            } else {
                data["posX"] = pos.x + "";
                data["posY"] = pos.y + "";
                delete data["nodeId"];
            }

            this.element.style.display = "inherit";

            var scrollX = pageXOffset, scrollY = pageYOffset;
            var rect = this.element.getBoundingClientRect();
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

            this.isOpen = true;
        }
        hide() {
            if (this.isOpen) {
                this.element.style.display = "none";
                this.isOpen = false;
            }
        }
    }
}