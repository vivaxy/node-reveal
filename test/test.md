# h1
## h2

---

```js
const object = {
    key: 'value',
};

let val;
({ val } = object);
```

---

```js
// error
const func = getFunction() || () => {};

// ok
const func = getFunction() || (() => {});
```
