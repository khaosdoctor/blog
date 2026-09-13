---
title: "JavaScript Decorators"
pubDate: 2022-11-04T14:00:14.000Z
updatedDate: 2026-07-16T16:05:19.000Z
category: "javascript"
tags: ["javascript", "ecmascript", "development", "typescript"]
lang: en
description: "One of the most important proposals for JavaScript has just reached stage 3! Understand what decorators are and why they are not the only novelty of this proposal!"
seoDescription: "One of the most important proposals for JavaScript is at stage 3! What are decorators and why are they not the only novelty of this proposal?"
slug: "javascript-decorators"
machineOwnedTranslation: true
draft: false
heroImage: "./cover-en.png"
---

Decorators are one of the oldest [proposals](https://github.com/tc39/proposal-decorators) for JavaScript. How many times have you heard that "JavaScript will have decorators soon"? But what are these decorators and what will they change in our lives? Today it is at stage 3, which means the time for it to go live is drastically reduced, but we still don't have a concrete answer.

If you don't know how JavaScript works, in this video I explain a bit more about the process of releasing new features to JavaScript, if you haven't watched it yet, I strongly recommend it to understand better how everything works!

![](https://www.youtube.com/watch?v=hDQu3AvvDfg)

## Decorators

Decorators are the short name for **decorator functions**, which is a design pattern, by the way. They are a function (or method) that modify the behavior of another function passed to them, returning a new function.

Essentially you can implement decorators in any language, after all they are a design pattern. In JavaScript you could implement a decorator like this:

```js
const decorator = (fn) => {
  return (...params) => {
    console.log('before the function')
    const resultado = fn.call(this, ...params)
    console.log('after the function')
    return resultado
  }
}

const func = (nome) => console.log(`Hi ${nome}`)
const decorada = decorator(func)
decorada('Lucas')
// before the function
// Hi Lucas
// after the function
```

However, some languages have special syntax for calling decorators, like Python and Java, for example, see how we can create a decorator in Python:

```python
def decorator(fn):
    def wrap():
        print("before the function")
        fn()
        print("after the function")
    return wrap

@decorator
def sayHello():
    print("hello!")

sayHello()

# before the function
# hello!
# after the function
```

Notice we have an `@decorator`? That is the most used syntax for calling a decorator on the function that comes right after it.

Most languages allow decorators to be applied in various places, like classes, methods, properties, and so on. In JavaScript this was not always the case, the previous version of the proposal (which was at stage 2) said that decorators could only be applied to classes and no other type of object.

With the new proposal, decorators can be applied to the following types of objects:

-   Classes (as they were already being applied before)
-   Class properties
-   Class methods
-   Class accessors

That is, we are still focusing on the class, but it is no longer only on the instance of the class, but on everything that comes inside it.

### Using decorators

Decorators are essentially functions, as we saw before. All these functions will take two parameters:

1.  The value being decorated, which is the element that decorator is applied to
2.  A context object, containing information about the decorated value

> Keep in mind that the decorated value is a **reference** to the original object, meaning any change to this value will affect the original value.

The declared type (taken from the proposal) is exactly this:

```ts
type Decorator = (value: Input, context: {
  kind: string;
  name: string | symbol;
  access: {
    get?(): unknown;
    set?(value: unknown): void;
  };
  private?: boolean;
  static?: boolean;
  addInitializer?(initializer: () => void): void;
}) => Output | void;
```

In this type, `Input` and `Output` represent, respectively, the object you are decorating and the return of the decorator, which is a function. Each type of decorator can return a different type of function and has a different input type, whether it is a class, property or accessor decorator.

The context object also varies depending on the value you are decorating, so it may or may not contain some of the fields, for example, the `access` field only exists for accessors.

The other properties have quite fixed values, for example:

-   `kind` is the type of object you are decorating, this property exists basically to check if you are using the decorator correctly and looking for the correct properties. The possible values are: `class`, `method`, `getter`, `setter`, `field` and `accessor`
-   `name` is the name of the decorated object, in the case of private elements it will be the description (which is the property name itself)
-   `access` an object that contains two possible keys `get` and `set` which are functions used to access the decorated value. It is important to note that these values are the final values that are passed to the instance of the object, not the value that was passed to the decorator
-   `static` indicates if the value is a static element of a class, therefore it only applies to elements that can be static
-   `private` indicates if the element is private, and has the same rule as `static`
-   `addInitializer` is an extra function that allows you to add initialization logic to the decorated object, all types have this functionality and it operates **per class** and not **per instance**, that is, it will only execute on objects that don't have `kind === 'field'`

### Order of application

Like all elements that support multiple types of use, decorators are applied in an order.

First they are only applied when all have been called. After that, decorators are applied from lower order to higher order, this means that first all decorators of methods and fields are called and applied and then decorators of class are applied and finally all static field decorators are applied.

Furthermore, there are no special rules about what type of function can be used as a decorator, as long as it follows the proposed signature, any function can be applied as a decorator.

## Types of decorators

Let's now go through each type of decorators we have in this proposal, starting with the higher order and descending to the lower orders.

### Class methods

Decorators applied to class methods like the following:

```js
class foo {
    @dec
    metodo (arg) {}
}
```

This type of decorator follows the following typing:

```ts
type ClassMethodDecorator = (value: Function, context: {
  kind: "method";
  name: string | symbol;
  access: { get(): unknown };
  static: boolean;
  private: boolean;
  addInitializer(initializer: () => void): void;
}) => Function | void;
```

See that the `kind` will always be `method` and the accessor will only have the `get` method, since you cannot do `set` on a method.

The parameter `value` is the method being decorated, and the decorator may or may not return a new method that will replace the method being decorated, if it doesn't return anything then the method will be executed normally.

A classic example is the log decorator I showed at the beginning of the article, we can create a new decorator to perform a log of what is being executed by the method, execute the method itself and then return the result:

```js
function debug(value, { kind, name }) {
  if (kind === "method") {
    return function (...args) {
      console.log(`starting ${name} with arguments ${args.join(", ")}`);
      const ret = value.call(this, ...args);
      console.log(`end of ${name}`);
      return ret;
    };
  }
}

class C {
  @debug
  m(arg) {}
}

new C().m(1);
// starting m with arguments 1
// end of m
```

Note that in this case we are returning a function that will replace the method in the original class (the prototype will be replaced), if we didn't return anything, only the decorator would be executed.

If we wanted to do this without using decorators, we can imagine that we have the class and we are replacing the method `m` in the prototype directly by calling it with our decorator:

```js
class C {
    m(arg) {}
}

C.prototype.m = debug(C.prototype.m, { kind: 'method', name: 'm' }) ?? C.prototype.m
```

### Class accessors

Class accessors (like `get` and `set`) can have two signatures depending on the type of accessor we are talking about, for `get`:

```ts
type ClassGetterDecorator = (value: Function, context: {
  kind: "getter";
  name: string | symbol;
  access: { get(): unknown };
  static: boolean;
  private: boolean;
  addInitializer(initializer: () => void): void;
}) => Function | void;
```

And for `set` the difference is that the `kind` will be `setter` and we will have an `access` with a `set` function:

```ts
type ClassSetterDecorator = (value: Function, context: {
  kind: "setter";
  name: string | symbol;
  access: { set(value: unknown): void };
  static: boolean;
  private: boolean;
  addInitializer(initializer: () => void): void;
}) => Function | void;
```

The behavior is exactly the same as method decorators, however it is important to note that accessor decorators are applied **separately** for getters and setters, that is:

```js
class C {
  @foo
  get x() {
    // ...
  }

  set x(val) {
    // ...
  }
}
```

In this class, the decorator is only decorating the `get x()` and not the `set x(val)`. They are so similar that we can reuse the same `debug` function we had before, we just need to handle the new types of `kind`:

```js
function debug(value, { kind, name }) {
  if (['method', 'getter', 'setter'].contains(kind)) {
    return function (...args) {
      console.log(`starting ${name} with arguments ${args.join(", ")}`);
      const ret = value.call(this, ...args);
      console.log(`end of ${name}`);
      return ret;
    };
  }
}

class C {
  @debug
  set x(arg)  {}
}

new C().x = 1
// starting x with arguments 1
// end of x
```

Similarly, we can apply this functionality without the use of decorators using `Object.defineProperty`:

```js
class C {
  set x(arg) {}
}

let { set } = Object.getOwnPropertyDescriptor(C.prototype, "x");
set = debug(set, {
  kind: "setter",
  name: "x",
  static: false,
  private: false,
}) ?? set;

Object.defineProperty(C.prototype, "x", { set });
```

### Class properties (class fields)

This type of decorator uses the complete typing:

```ts
type ClassFieldDecorator = (value: undefined, context: {
  kind: "field";
  name: string | symbol;
  access: { get(): unknown, set(value: unknown): void };
  static: boolean;
  private: boolean;
}) => (initialValue: unknown) => unknown | void;
```

It has both the `get` and `set` accessors, and it has the `static` and `private` properties, however, unlike the others, it does not have an `addInitializer` method since properties cannot be initialized that way.

Also, unlike the other types of decorators, since properties don't have a direct input value, the `value` is always `undefined`, that is, you don't receive the property and not a reference to it, instead you can return a function that receives the initial value and returns a new value whenever the property is assigned.

In order to use our debug function in these cases, we will need a small modification, since we cannot return a new function but rather an initial value.

```js
function debug (_, {kind, name}) {
    if (king === 'field') {
        return function (initialValue) {
             console.log(`initializing variable ${name} with value ${initialValue}`)
            return initialValue
        }
    }
}
```

And then we can use our field like this:

```js
class C {
    @debug x = 1
}

new C()
// Initializing variable x with value 1
```

And we can implement this same behavior using an initialization call on the property:

```js
const inicializarX = debug(undefined, { kind: 'field', name: 'x' }) ?? (initialValue) => initialValue

class C {
	x = inicializarX.call(this, 1)
}
```

One of the interesting examples that the proposal itself presents is that, since the initialization function is called with the instance of the class as `this`, then this type of decorator can be used to create initialization relationships, like registering a child class in a parent class as shown in the example below:

```js
const CHILDREN = new WeakMap();

function registerChild(parent, child) {
  let children = CHILDREN.get(parent);

  if (children === undefined) {
    children = [];
    CHILDREN.set(parent, children);
  }

  children.push(child);
}

function getChildren(parent) {
  return CHILDREN.get(parent);
}

function register() {
  return function(value) {
    registerChild(this, value);

    return value;
  }
}

class Child {}
class OtherChild {}

class Parent {
  @register child1 = new Child();
  @register child2 = new OtherChild();
}

let parent = new Parent();
getChildren(parent); // [Child, OtherChild]
```

> Of course, you can also use a list of child classes inside the parent class, for example, to register dependency injection.

### Classes

The last type of decorator is also one of the most common, the class decorator. It follows a simplified version of the interface:

```ts
type ClassDecorator = (value: Function, context: {
  kind: "class";
  name: string | undefined;
  addInitializer(initializer: () => void): void;
}) => Function | void;
```

The big difference besides the `kind` is that we don't have accessor methods and we also don't have the private and static properties.

The first parameter will always be the class being decorated and it can return a new callable object, which is a function, a class, a Proxy, or anything else that can be invoked.

An example is extending the constructor of a class so that we can include a call to a console whenever a new class is invoked:

```js
function debug (value, {kind, name}) {
    if (kind === 'class') {
        return class extends value {
            constructor (...args) {
                super(...args)
                console.log(`building a new instance of ${name} with arguments ${args.join(', ')}`)
            }
        }
    }
}
```

And use it in our class like this:

```js
@debug
class C {}

new C(1)
// building a new instance of C with arguments 1
```

Essentially we can do the same thing without decorators like this:

```js
class C {}

C = debug(C, {kind: 'class', name: 'C'}) ?? C
new C(1)
```

## Auto accessors

Along with the decorators proposal, this document also proposes another syntax element called **auto accessors**. Today we can declare accessors like this:

```js
class foo {
    #privado = true
    
    get getPrivado () { return this.#privado }
    set setPrivado (val) { this.#privado = val }
}
```

So we will have a `getPrivado` property and a `setPrivado` to be able to access private properties inside classes, which is very useful when we have to do some data processing or set some type of information that requires some prior processing.

What the proposal presents is the new keyword `accessor`, which will do the following operations:

1.  Create a private property with the same name inside the class
2.  Create a `get` accessor and a `set` accessor for this property with the same name

In the end we will have a syntax like this:

```js
class C {
    acessor x = 1
}

const c = new C()
c.x // 1
c.x = 2
c.x // 2
```

This is the same as doing:

```js
class C {
    #x = 1
    
    get x() {
        return this.#x
    }

	set (val) {
        this.#x = val
    }
}
```

One detail is that we can also have private accessors:

```js
class C {
    accessor #x = 2
}
```

> In my view, the proposal presents `auto-accessors` as a way to work around the problem that we cannot set a decorator automatically for a `get` and a `set`, as I explained before, so we would have to call the same function twice for essentially the same variable.

Auto-accessors use a slightly different version of the interface:

```ts
type ClassAutoAccessorDecorator = (
  value: {
    get: () => unknown;
    set(value: unknown) => void;
  },
  context: {
    kind: "accessor";
    name: string | symbol;
    access: { get(): unknown, set(value: unknown): void };
    static: boolean;
    private: boolean;
    addInitializer(initializer: () => void): void;
  }
) => {
  get?: () => unknown;
  set?: (value: unknown) => void;
  init?: (initialValue: unknown) => unknown;
} | void;
```

As you can see, the value we receive in the first parameter is an object with the two accessors of the property. The context object receives a `kind` as `accessor`, the `access` property with both the `get` and `set` functions and the other properties we see in the other interfaces.

The thing is, for the first parameter, we will receive the object with the two accessors that **are defined in the prototype of the class**, that is, it is the actual access object that the class will have. In case we have a static accessor, we will receive the class itself.

This object exists so that the decorator can create a wrap around them and return a new `get` and/or a new `set`, essentially creating a proxy that intercepts calls to any of these accessors. Which is not possible with normal class properties.

Additionally, when we return the object with the properties, we can also return an `init` function which is an initialization function that can be used to change the initial value of the private variable that is set in the class. If you return the object without any of the values, whether `get`, `set` or `init` the original value of the accessor will be used.

Creating an example with our debug decorator, we can make an extension to make it work with auto-accessors:

```js
function debug (target, {kind, name}) {
  if (kind === 'accessor') {
    const {get, set} = target
    return {
      get() {
        console.log(`get ${name}`)
        return get.call(this)
      },
      set(val) {
        console.log(`set ${name} to ${val}`)
        return set.call(this, val)
      },
      init (initialValue) {
        console.log(`initializing ${name} with value ${initialValue}`)
        return initialValue
      }
    }
  }
}
```

As you can see, auto-accessors are a bit longer to work with because you need to return an object of functions, but it's nothing more than what we've done here in most of the other cases.

After that we can use them like this:

```js
class C {
  @debug accessor x = false
}

const c = new C()
// initializing x with value false
c.x
// get x
c.x = true
// set x to true
c.x 
// get x
```

If we want to do the same thing without decorators, we will use a mixture of what we have in properties and the accessors we've done before:

```js
class C {
  #x = inicializarX.call(this, 1);

  get x() {
    return this.#x;
  }

  set x(val) {
    this.#x = val;
  }
}

let { get: oldGet, set: oldSet } = Object.getOwnPropertyDescriptor(C.prototype, "x");

let {
  get: newGet = oldGet,
  set: newSet = oldSet,
  init: initializeX = (initialValue) => initialValue
} = logged(
  { get: oldGet, set: oldSet },
  {
    kind: "accessor",
    name: "x",
    static: false,
    private: false,
  }
) ?? {};

Object.defineProperty(C.prototype, "x", { get: newGet, set: newSet });
```

## `addInitializer` and context initialization

The `addInitializer` method that we saw in some of the interfaces in the context object of all decorators, except the class one, is a method that can be called to associate an initialization function with the class or the element that we are decorating.

This method can be used to run any code after the value **has already been set** allowing you to finalize the initialization of that value. However, the order of execution of these initializers depends on the decorator we are using:

-   For **classes**, initializers run **after** the class has been completely defined, after all static properties are assigned
-   For class elements, initializers run **during** construction, but **before** initialization of class properties
-   For **static** elements, initializers also run **during** class initialization, **before** static fields are defined, but **after** all class elements are defined

Some examples that the proposal presents.

### @customElement

We can use `addInitializer` to be able to decorate a class that will register a new webComponent in the browser:

```js
function customElement (name) {
    return (value, { addInitializer }) => {
        addInitializer(function() {
            customElements.define(name, this)
        })
    }
}

@customElement('elemento')
class Elemento extends HTMLElement {
    static get observedAttributes() {
        return ['attr', 'att']
    }
}
```

In this example, notice that we can "decorate" a decorator by wrapping it with another function so that we can pass parameters to it, in this case we want to pass the name of the element to the decorator, so we can create a function that receives the name and returns another function with the same signature as the decorator.

### @bound

A decorator that is applied to a method of a class to be able to modify its `this` to the `this` of that class:

```js
function bound (value, {name, addInitializer}) {
    addInitializer(function () {
        this[name] = this[name].bind(this)
    })
}

class C {
    message = 'hi!'

	@bound
	m() {
        console.log(this.message)
    }
}

const {m} = new C()
m() // hi!
```

> Notice that, in both cases, we are using `function()` inside `addInitializer`, this is because we want to **maintain** the `this` of that scope as being the scope of the decorator, this is more evident in this example, but it also applies to `@customElement`

## Context accessors

An object that we didn't use here was the `access` object that comes from inside the context of decorators.

A very useful example is creating a **dependency injection container**. Which is a very useful tool to be able to automatically create instances of dependent classes for classes that take these dependencies, so you don't have to pass all dependencies as parameters.[^n1]

Essentially what we need to do is have a global list of classes and their dependencies:

```js
const INJETAVEIS = new WeakMap()

function initContainer() {
    const injecoes = []
    
    function injetavel (Class) {
        INJETAVEIS.set(Class, injecoes)
    }
    
    function injetar (chave) {
        return function aplicarDependencia (alvo, contexto) {
            injecoes.push({ chave, set: context.access.set })
        }
    }
    
    return { injetavel, injetar }
}
```

This function will initialize our global list of dependencies for a given class, so what we need to do is annotate the class we want to automate with `@injectable` and the dependencies of that class with `@inject`. But first we need a container that will be our global instance that will read from this list:

```js
class Container {
    registro = new Map()
	
	registrar (nome, valor) {
        this.registro.set(nome, valor)
    }

	buscar (nome) {
        return this.registry.get(nome)
    }

	criar (Classe) {
        const instancia = new Classe()
        
        for (const { chave, set } of INJETAVEIS.get(Classe) || []) {
            set.call(instancia, this.buscar(chave))
        }
        
        return instancia
    }
}
```

Here what we are doing is creating a container that will register the global dependencies, that is, all the classes that we instantiate once, this registry will have the name we want to give it and also the instance of the class we created.

When we define a new class through the container using `create`, we will pass the constructor of the class we want to create, then we will search for all injectable classes that match that description in our global list and we will call the `set` method to set a new property in the class.

When we call `set.call(instancia, this.buscar(chave))` we are saying that we want the annotated property to call its `set` accessor with the `this` set to the new instance of the class we created, with the value being the dependent class that we have already instantiated before.

Let's give an example:

```js
class Store {}

const { injetavel, injetar } = initContainer()

// Class C is injectable and can receive external dependencies
@injetavel
class C {
    // This property is the instance stored in the key
    // nomeDaclasse that we registered in the container
    @injetar('nomeDaClasse') store
}

const container = new Container()
const store = new Store()

// Registering the Store in the container as a dependency
container.register('nomeDaclasse', store)

const c = container.create(C)
c.store === store // true
```

See that we are using `container.create(C)` to create a new class with the dependencies already injected, but this is not completely necessary, as you can see [in this TSyringe documentation](https://www.npmjs.com/package/tsyringe#autoinjectable) and as I showed before, we can use decorators to completely replace the constructor of the class and run this logic automatically for all dependencies of the same class.

## Testing it yourself

If you want to run any of the code I put here, even before the proposal is completely published and available, this is possible through transpilers like `babel`.

For this, create a new folder anywhere and run `npm init -y` (remembering that you need to have Node and NPM installed), this will create a new `package.json` file, then run the command `npm i -D @babel/cli @babel/core @babel/plugin-proposal-decorators @babel/preset-env`.

Open the `package.json` file and, in the `scripts` section, add a new script `transpile`:

```json
{
	"scripts": {
    	"transpile": "babel src -d dist"
	}
}
```

This script will take any `.js` code inside the `src` folder and will transpile it to a new file in the `dist` folder.

Now create a new file called `babel.config.json` with this content:

```json
{
  "presets": [
    [
      "@babel/preset-env",
      {
        "targets": {
          "node": "current"
        }
      }
    ]
  ],
  "plugins": [
    [
      "@babel/plugin-proposal-decorators",
      {
        "version": "2022-03"
      }
    ]
  ]
}
```

Write a test file with any of the examples, or then create your own, like this:

```js
@annotation
class MyClass {
  @property accessor bool = false
}

function annotation(...params) {
  console.log(params)
}

function property(target, name) {
  console.log(target, name)
  return {
    get() {
      console.log('get')
      return target.get.call(this)
    },
    set(val) {
      console.log('set', val)
      return target.set.call(this, val)
    }
  }
}

function debug(target, { kind, name }) {
  if (kind === 'accessor') {
    const { get, set } = target
    return {
      get() {
        console.log(`get ${name}`)
        return get.call(this)
      },
      set(val) {
        console.log(`set ${name} to ${val}`)
        return set.call(this, val)
      },
      init(initialValue) {
        console.log(`initializing ${name} with value ${initialValue}`)
        return initialValue
      }
    }
  }
}

const a = new MyClass()
console.log(a.bool)
a.bool = true
console.log(a.bool)
```

Run `npm run transpile` and then `node dist/<file>.js` and see the magic happen!

## Conclusion

Decorators are an amazing design pattern and have tremendous potential to be one of the most interesting features of the language and allow us to do much more in a much simpler way.

I personally see great adoption by monitoring tools like NewRelic, NSolid and Datadog for Node.js and even JavaScript in the browser!

Comment down below what you thought of this proposal and mention me [on Twitter](https://twitter.lsantos.dev) so I know your opinion!

[^n1]: This is already a reality with the [TSyringe](http://npm.im/tsyringe) library made by Microsoft to demonstrate the power of decorators in TypeScript.
