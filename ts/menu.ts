/// <reference path="_refs.ts"/>
module Tesp {
    export class MenuItem {
        static separator = new MenuItem("");

        constructor(public label: string, public func?: () => void) { }
    }
    export class Menu {
        element: HTMLElement;

        private listener: ChangeListener;
        private disposed = false;
        private links: HTMLElement[];

        /** Create a new menu instance. Remember to call dispose() once you're done */
        constructor(private app: Application, fixed: boolean) {
            this.listener = this.app.addChangeListener(ChangeReason.ClearMenus, () => this.hide());
            this.element = document.createElement("ul");
            this.element.className = "menu";
            if (fixed)
                this.element.classList.add("fixed");
            this.element.onmousedown = ev => ev.stopPropagation();
            this.app.element.appendChild(this.element);
        }
        /** Clean up this menu after its use */
        dispose() {
            if (this.disposed) return;
            this.app.removeChangeListener(this.listener);
            this.element.parentElement.removeChild(this.element);
            this.disposed = true;
        }

        /** Get the menu element's css style object */
        getStyle(): CSSStyleDeclaration {
            return this.disposed ? null : this.element.style;
        }

        /** Construct the Menu's contents from MenuItems */
        setData(items: MenuItem[]) {
            if (this.disposed) return;

            this.hide();
            var child: Element;
            while ((child = this.element.firstElementChild) != null) {
                this.element.removeChild(child);
            }

            var links: HTMLElement[] = this.links = [];
            items.forEach(item => {
                var li = document.createElement("li");
                this.element.appendChild(li);
                if (item === MenuItem.separator) {
                    li.className = "separator";
                } else {
                    li.textContent = item.label;
                    if (item.func != null) {
                        li.className = "link";
                        var idx = li.tabIndex = links.push(li);
                        li.onmousedown = ev => {
                            ev.stopPropagation();
                            item.func();
                            this.hide();
                        };
                        li.onkeydown = ev => {
                            if ((ev.which === 38 || ev.which === 40)) {
                                links[
                                    (idx + (ev.which === 40 ? 0 : -2) + links.length)
                                    % links.length
                                ].focus();
                            } else if (ev.which === 13) {
                                item.func();
                                this.hide();
                            } else return true;
                            ev.stopPropagation();
                            return false;
                        }
                    }
                }
            });
        }

        /** Show the menu */
        open() {
            if (this.disposed) return;
            this.app.triggerChange(ChangeReason.ClearMenus);
            if(this.element.firstElementChild != null)
                this.element.style.display = "inherit";
        }
        /** Hide the menu */
        hide() {
            if (this.disposed) return;
            this.element.style.display = "none";
        }
        /** Is the menu visible? */
        isOpen(): boolean {
            return !this.disposed && this.element.style.display !== "none";
        }
        /**
         * Set a menu link as the focused element.
         * Parameter specifies index of link to focus (default is 0, negative values count from end)
         */
        focus(index: number = 0) {
            if (this.disposed) return;
            var elem = <HTMLElement>this.element.querySelector(".link");
            if (elem != null) {
                if (index === 0) {
                    elem.focus();
                } else {
                    var len = this.links.length;
                    var idx = ((index % len) + len) % len;
                    this.links[idx].focus();
                }
            }
        }
    }
}