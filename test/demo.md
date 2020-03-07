# h1

## h2

### h3

#### h4

##### h5

###### h6

Paragraph

Note:

This is note content.

---

Syntax Highlight

```js
const object = {
  key: 'value',
};

let val;
({ val } = object);
```

```js
function App({ title, style }) {
  return (
    <h1 className="app" style={style}>
      {title}
    </h1>
  );
}
```

---

## Line Numbers & Step-by-step Highlights

<pre>
<code class="hljs" data-line-numbers="1|3,6-14|4">import React, { useState } from 'react';

function Example() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <p>You clicked {count} times</p>
      <button onClick={() => setCount(count + 1)}>
        Click me
      </button>
    </div>
  );
}
</code>
</pre>

---

## Lists

- List1
- List2
  - Item1
  - Item2

---

Define Slide Style

<!-- .slide: data-background="#ff9999" style="color: #ffffff;" -->

---

Fragment

- Item 1 <!-- .element: class="fragment" data-fragment-index="2" -->
- Item 2 <!-- .element: class="fragment grow" data-fragment-index="1" -->

---

![img](./parallax.jpg)

---

End
