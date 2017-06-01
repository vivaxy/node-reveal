# h1
## h2
### h3
#### h4
##### h5

---

- list1
- list2
    - item1
    - item2

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
