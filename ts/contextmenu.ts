module tesp {
    export class ContextMenu {
        constructor(private app: Application, private element: HTMLElement) {
            this.element.oncontextmenu = this.element.onmousedown = ev => ev.stopPropagation();
            this.element.onclick = ev => {
                ev.stopPropagation();
                var item = <HTMLElement>event.target;
                if (item.classList.contains("link")) {
                    var context = item.dataset['contextSet'];
                    if (context !== undefined) {
                        var data = this.element.dataset;
                        var nodeId = data['nodeId'];
                        var node: Node;
                        if (nodeId !== undefined && (node = this.app.world.findNodeById(+nodeId)) != null) {
                            this.app.world.setContextNode(context, node);
                        } else {
                            this.app.world.setContextLocation(context, +data['posX'], +data['posY']);
                        }
                    } else {
                        context = item.dataset['contextUnset'];
                        if (context !== undefined) {
                            this.app.world.clearContext(context);
                        }
                    }
                    this.hide();
                }
            };
        }

        openNode(node: Node) {
            this.open(node.pos.x, node.pos.y, node);
        }

        open(x: number, y: number, node: Node) {
            if (node != null && !node.permanent)
                node = null; // disallow operations on temporary nodes

            var lines: string[] = [];
            var landmark = this.app.world.getLandmarkName(x, y);
            if (node != null) {
                var feat = this.app.world.features.byName[node.type];
                if (feat != null) {
                    lines.push(feat.location || feat.name);
                    lines.push(node.name);
                } else {
                    lines.push(node.longName);
                }
                if (landmark != null && landmark !== node.name) {
                    lines.push(landmark);
                }
                x = node.pos.x;
                y = node.pos.y;
            } else if (landmark != null) {
                lines.push(landmark);
            }
            var region = this.app.world.getRegionName(x, y);
            if (region != null) {
                lines.push(region + " Region");
            }

            var separator = this.element.getElementsByClassName("separator")[0];
            var child: Element;
            while ((child = this.element.firstElementChild) != separator) {
                this.element.removeChild(child);
            }

            lines.forEach(l => {
                var item = document.createElement("li");
                item.textContent = l;
                this.element.insertBefore(item, separator);
            });

            this.element.style.left = x + "px";
            this.element.style.top = y + "px";

            var data = this.element.dataset;
            if (node != null) {
                data['nodeId'] = node.id + '';
                delete data['posX'];
                delete data['posY'];
            } else {
                data['posX'] = x + '';
                data['posY'] = y + '';
                delete data['nodeId'];
            }

            this.element.style.display = "inherit";

            var scrollX: number = pageXOffset, scrollY: number = pageYOffset;
            var rect = this.element.getBoundingClientRect();
            if (rect.left < 10) {
                scrollX = pageXOffset + rect.left - 10;
            } else if (rect.right > innerWidth - 27) {
                scrollX = pageXOffset + rect.right - innerWidth + 27;
            }

            if (rect.top < 10) {
                scrollY = pageYOffset + rect.top - 10;
            } else if (rect.bottom > innerHeight - 27) {
                scrollY = pageYOffset + rect.bottom - innerHeight + 27;
            }

            if (scrollX !== pageXOffset || scrollY !== pageYOffset)
                scroll(scrollX, scrollY);
        }
        hide() {
            this.element.style.display = "none";
        }
    }
}