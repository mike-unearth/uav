(() => {

    const ESCAPE_MAP = {
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        '\'': '&apos;'
    };

    /**
     * Returns an HTML-escaped string
     */
    function escape(value) {

        return typeof value === 'string' 
            ? value.replace(/[<>'"]/g, c => ESCAPE_MAP[c])
            : '';

    }

    /**
     * Turns an HTML string into an element
     */
    function parse(markup) {

        let el = document.createElement('div');

        el.innerHTML = markup;

        if (el.children.length > 1) {
            console.error('Components must have only one root node.');
        }

        el = el.firstElementChild;

        return el;

    }

    /**
     * Tests whether a value has properties that should be bound recursively
     */
    function isVmEligible(value) {

        return value && !Array.isArray(value) && typeof value === 'object';

    }

    /**
     * Binds an object's properties to the given function
     */
    function bindPropertiesToSetter(obj, setter) {

        Object.keys(obj).forEach(key => {

            let value = obj[key];

            Object.defineProperty(obj, key, {

                get: () => value,
                set: newVal => {

                    value = newVal;

                    setter('_childPropertyModified');

                }

            });

            if (isVmEligible(obj[key])) {

                bindPropertiesToSetter(obj[key], setter);

            }

        });

    }

    /**
     * Returns an object that will execute
     * bindings when its properties are set
     */
    function model(data) {

        const vm = {
            _bindings: {}
        };

        Object.keys(data).forEach(key => {

            function get() {

                if (vm._currentlyCreatingBinding) {

                    vm._bindings[key] = vm._bindings[key] || [];

                    vm._bindings[key].push(vm._currentlyCreatingBinding);

                }

                return data[key];

            }

            function set(value) {

                if (data[key] !== value) {

                    if (value !== '_childPropertyModified') {

                        if (isVmEligible(value)) {

                            bindPropertiesToSetter(value, set);

                        }

                        data[key] = value;

                    }

                    if (vm._bindings[key]) {

                        vm._bindings[key].forEach(binding => binding());

                    }

                }

            }

            Object.defineProperty(vm, key, {
                get,
                set
            });

            if (isVmEligible(data[key])) {

                bindPropertiesToSetter(data[key], set);

            }

        });

        return vm;

    }

    /**
     * Runs the given expression using an
     * object as the scope. Unlike eval(),
     * this does NOT evaluate the expression
     * with the priviledges or scope of the
     * parent execution context.
     */
    function evaluate(expression, scope) {

        try {

            return new Function(`
                with (arguments[0]) {
                    return ${expression};
                }`)(scope);

        } catch (err) {

            return '_invalidExpression';

        }

    }

    /**
     * Parses a template and creates bindings
     * to all values it references
     */
    function bind(template, vm, replace) {

        const matches = template.match(/{(.*?)}/g);

        if (matches) {

            let firstTime = true;

            function binding() {

                let content = template;

                let value;

                matches.forEach(match => {

                    const prop = match.substring(1, match.length - 1);

                    if (firstTime) {

                        vm._currentlyCreatingBinding = binding;

                    }

                    value = evaluate(prop, vm);

                    delete vm._currentlyCreatingBinding;

                    if (typeof value === 'boolean') {

                        content = content.replace(match, value ? prop : '');
                    
                    } else if (typeof value === 'function') {

                        content = value;

                    } else if (value && typeof value === 'object' && value._element) {

                        content = value._element;

                    } else {

                        value = value === '_invalidExpression' ? '' : escape(value);

                        content = content.replace(match, value);

                    }

                });

                replace(content);

            }

            binding();

            firstTime = false;

        }

    }

    /**
     * Recursively renders and binds the content of an element.
     */
    function loop(tag, prop, temp, template, vm, replace) {

        let firstTime = true;

        function binding() {

            if (firstTime) {

                vm._currentlyCreatingBinding = binding;

            }

            const data = evaluate(prop, vm);

            delete vm._currentlyCreatingBinding;

            const el = document.createElement(tag);

            if (data !== '_invalidExpression') {

                const children = parse(`<div>${template}</div>`).childNodes;

                if (Array.isArray(data)) {

                    const tempOriginalValue = vm[temp];

                    data.forEach(item => {

                        vm[temp] = item;

                        children.forEach(child => el.appendChild(child.cloneNode(true)));

                        render(el, vm);

                    });

                    vm[temp] = tempOriginalValue;

                } else {

                    if (typeof temp === 'string') {

                        temp = temp.split('.');

                    }

                    Object.keys(data).forEach(key => {

                        const keyOriginalValue = vm[temp[0]],
                            valOriginalValue = vm[temp[1]];

                        vm[temp[0]] = key;
                        vm[temp[1]] = data[key];

                        children.forEach(child => el.appendChild(child.cloneNode(true)));

                        vm[temp[0]] = keyOriginalValue;
                        vm[temp[1]] = valOriginalValue;

                    });

                }

            }

            replace(el);

        }

        binding();

        firstTime = false;

    }

    /**
     * Helper for looping over element attributes.
     */
    function forEachAttribute(el, callback) {

        for (let i = 0; i < el.attributes.length; i++) {

            callback(el.attributes[i]);

        }

    }

    /**
     * Checks all elements and attributes for template expressions
     */
    function render(el, vm) {

        forEachAttribute(el, attribute => {

            if (attribute.specified && attribute.name !== 'as') {

                if (attribute.name === 'loop' && el.attributes.as) {

                    loop(el.tagName,
                        attribute.value,
                        el.attributes.as.value, 
                        el.innerHTML, 
                        vm,
                        child => {
                            el.parentNode.replaceChild(child, el);
                            forEachAttribute(el, attr => {
                                child.setAttribute(attr.name, attr.value);
                            });
                            el = child;
                        }
                    );

                    el.removeAttribute('loop');
                    el.removeAttribute('as');

                } else {

                    bind(attribute.value, vm, value => {

                        if (typeof value === 'function') {

                            el.removeAttribute(attribute.name);

                            el[attribute.name] = value;

                        } else {

                            attribute.value = value;

                        }

                    });

                }

            }

        });

        el.childNodes.forEach(child => {

            if (child.nodeType === 3) {

                bind(child.textContent, vm, value => {

                    child.textContent = value;

                });

            } else {

                const tag = child.tagName.toLowerCase();

                if (vm[tag] !== undefined && vm[tag]._element) {

                    bind(`{${tag}}`, vm, newChild => {

                        el.replaceChild(newChild, child);

                        child = newChild;

                    });

                } else {

                    render(child, vm);

                }

            }

        });

        return el;

    }

    /**
     * Creates a bound component, optionally
     * inserting it into a parent node
     */
    function component(vm, template, parentSelector) {

        vm._element = render(parse(template), vm);

        if (parentSelector) {

            const app = document.querySelector(parentSelector);

            app.innerHTML = '';

            app.appendChild(vm._element);

        }

        return vm;

    }

    /**
     * Returns the first matched DOM node or executes
     * a callback on all matched DOM nodes
     */
    function uav(selector, callback) {

        if (callback) {

            [...document.querySelectorAll(selector)].forEach(callback);

        } else {

            return document.querySelector(selector) || document.createElement('div');

        }

    }

    /**
     * Returns a placeholder component, for cases
     * where a template is bound to a component that
     * does not yet exist.
     */
    function placeholder(tag) {

        return {
            _element: document.createElement(tag || 'div')
        };

    }

    uav.model = model;

    uav.component = component;

    uav.placeholder = placeholder;

    if (typeof module !== 'undefined' && module.exports) {

        module.exports = uav;

    } else {

        window.uav = uav;

    }

})();
