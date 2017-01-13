# UAV

A simple utility for one-way data binding.

## Install

`yarn add https://github.com/mike-unearth/uav`

## Example

```javascript
const model = uav.model({
    visible: true,
    text: 'hello',
    click: message => e => console.log(message, e),
    items: [1, 2, 3]
});

const component = uav.component(model, `
    <div>
        <h1 class="{visible}">{text}</h1>
        <a onclick={click('clicked!')}>Click me</a>
        <ul loop="items" as="item">
            <li>{item}</li>
        </ul>
    </div>
`}, '#app');
```

This renders the following into the `#app` element:

```html
<div>
    <h1 class="visible">hello</h1>
    <a>Click me</a>
    <ul>
        <li>1</li>
        <li>2</li>
        <li>3</li>
    </ul>
</div>
```

While template expressions have been removed, bound events work as expected.

If we run `component.text = 'updated'`, the content of the `<h1>` will update.

If we run `component.visible = false`, the `<h1>` will lose the `visible` class.

If we run `component.visible = 'hidden'`, the class of the `<h1>` will change to `hidden`;

If we run `component.click = () => alert('foo')`, clicking the `<a>` will trigger the alert.

If we run `component.items = component.items.concat([4])`, an additional `<li>` will be rendered.

If we run `component.items.push(4)`, nothing will happen, because we did not trigger the model's setter. ES6 proxies could fix this, but don't have sufficient browser support at the time of this writing.

## Child Components

Given the above component, we could include it in another component thusly:

```javascript
const parentModel = uav.model({
    child: component,
    cssClass: 'parent'
});

uav.component(parentModel, `
    <div class="{cssClass}">
        This is a component with a child.
        <child></child>
    </div>
`, '#app');
```

## Passing Data to Children

Child component:

```javascript
function child(data) {
    return uav.component(
        uav.model({ data }),
        `<h1>{data}</h1>`);
}

const parentModel = uav.model({
    child: child('foo')
});

uav.component(parentModel, `
    <div>
        This component passes data it its child.
        <child></child>
    </div>
`);
```

## Looping over Objects

Template loops over arrays are demonstrated above. Looping over an object is also supported:

```javascript
const model = uav.model({
    obj: {
        a: 1,
        b: 2,
        c: 3
    }
});

uav.component(model, `
    <ul loop="obj" as="key.value">
        <li>{key} = {value}</li>
    </ul>
`}, '#app');
```

## DOM Access

Using bound templates generally supplants the need to perform any manual DOM manipulation. However, there are occasions where it is unavoidable. Elements can be accessed by passing a selector (and optionally, a callback) to the `uav` function.

Access the first matched element:

`uav('.item').classList.toggle('visible');`

Access all matched elements by passing a callback:

`uav('.item', item => item.classList.toggle('visible'));`

## Browser Compatibility

IE9+
