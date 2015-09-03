module Tesp {
    export class MenuItem {
        static separator = new MenuItem("");

        constructor(public label: string, public func?: () => void) { }
    }
    export class Menu {
        element: HTMLElement;

        private listener: ChangeListener;
        private disposed = false;

        constructor(private app: Application, fixed: boolean) {
            this.listener = this.app.addChangeListener(ChangeReason.ClearMenus, () => this.hide());
            this.element = document.createElement("ul");
            this.element.className = "menu";
            if (fixed)
                this.element.classList.add("fixed");
            this.element.onmousedown = ev => ev.stopPropagation();
            this.app.element.appendChild(this.element);
        }
        dispose() {
            if (this.disposed) return;
            this.app.removeChangeListener(this.listener);
            this.element.parentElement.removeChild(this.element);
            this.disposed = true;
        }

        getStyle(): CSSStyleDeclaration {
            return this.disposed ? null : this.element.style;
        }

        setData(items: MenuItem[]) {
            if (this.disposed) return;

            this.hide();
            var child: Element;
            while ((child = this.element.firstElementChild) != null) {
                this.element.removeChild(child);
            }

            items.forEach(item => {
                var li = document.createElement("li");
                this.element.appendChild(li);
                if (item === MenuItem.separator) {
                    li.className = "separator";
                } else {
                    li.textContent = item.label;
                    if (item.func != null) {
                        li.className = "link";
                        li.onmousedown = ev => {
                            ev.stopPropagation();
                            item.func();
                            this.hide();
                        };
                    }
                }
            });
        }

        open() {
            if (this.disposed) return;
            this.app.triggerChange(ChangeReason.ClearMenus);
            this.element.style.display = "inherit";
        }
        hide() {
            if (this.disposed) return;
            this.element.style.display = "none";
        }
    }
}