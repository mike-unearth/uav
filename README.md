# UAV

UAV is a JavaScript utility for templates with one-way data binding. It is 1.6KB after compression.

## Install

`yarn add https://github.com/mike-unearth/uav`

## Example

[See a JSFiddle](http://jsfiddle.net/t16bzg3m/5/)

### Creating a Model

`uav.model(model)`

Arguments:
- `model`: a raw object, with any properties, to be used as the view model.

Returns: An object with the same properties as `model`. When a property on this object is changed, any template expressions which reference it will be reevaluated and rendered.

```javascript
const model = uav.model({
    text: 'hello, world!'
});
```

### Creating a Component

`uav.component(model, template, selector)`

Arguments:
- `model`: The return value of `uav.model`. Optional.
- `template`: A template string.
- `selector`: An optional CSS selector. If included, the component will be rendered into the first matched element.

Returns: The model.

```javascript
const component = uav.component(model, `
    <h1>{text}</h1>
`);
```

### Template Expressions

Expressions are best explained by example:

Basic expression:
```javascript
`<div>This is a content expression: {content}</div>`
```
Attribute expression:
```javascript
`<div class="wrapper {visible}"></div>`
```

If an attribute expression evaluates to a boolean, it will render nothing if false, or the property name if true. This makes toggling the "visible" class on the above `<div>` as easy as `model.visble = !model.visible`.

Event expression:
```javascript
`<div onclick="{click}"></div>`
```

Any template expression which evaluates to a function is assumed to be an event handler, and will be passed the event object.

Array loop expression:
```javascript
`<li loop="items" as="item">{item}</li>`
```

Add the `loop` and `as` attributes to an element to repeat its content for each item in an array.

Object loop expression:
```javascript
`<li loop="object" as="key.value">{key} = {value}</li>`
```

## Child Components

Components can be rendered into other components by adding them to the model and referencing them as HTML tags.

```javascript
const child = uav.component('<div>I am a child.</div>');

const model = uav.model({
    child
});

uav.component(model, `
    <div>
        This is a component with a child.
        <child></child>
    </div>
`, '#app');
```

This will render the following into the `#app` component:

```html
<div>
    This is a component with a child.
    <div>I am a child.</div>
</div>
```

## Passing Data to Children

```javascript
function child(data) {

    const childModel = uav.model({ data });

    return uav.component(childModel, `<div>{data}</div>`);
}

const model = uav.model({
    child: child('This is passed from parent to child.')
});

uav.component(model, `
    <div>
        This component passes data to its child.
        <child></child>
    </div>
`);
```

This will render the following into the `#app` component:

```html
<div>
    This component passes data to its child.
    <div>This is passed from parent to child.</div>
</div>
```

## DOM Access

Data-bound templates generally supplant the need to perform any manual DOM manipulation. However, there are occasions where it is unavoidable. Elements can be accessed by passing a selector (and optionally, a callback) to the `uav` function.

Access the first matched element:

`uav('.item').classList.toggle('visible');`

Access all matched elements by passing a callback:

`uav('.item', item => item.classList.toggle('visible'));`

## Browser Compatibility

IE9+
