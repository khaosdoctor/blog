---
title: "Cryptography #1 - Asymmetric Cryptography with RSA"
pubDate: 2024-03-06T11:00:32.000Z
updatedDate: 2026-07-16T15:52:25.000Z
category: security
tags:
  - security
  - development
  - cryptography
  - series
series: cryptography-beginners
seriesOrder: 1
lang: en
description: Do you know how asymmetric key pairs that are all around us work? Want to learn how to calculate a key manually? Then this article is for you!
seoTitle: Asymmetric cryptography and RSA keys - How do they work?
seoDescription: In this article we will deeply learn what RSA and asymmetry are by creating our own RSA key manually and understanding all the concepts!
slug: asymmetric-cryptography-with-rsa
machineOwnedTranslation: true
draft: false
heroImage: ./cover-en.png
---

In the first article of this series we covered some basic cryptography concepts, and now that you know them, let's dive into one of the most common topics for developers in general. **Asymmetric Cryptography**.

So here I'll try to explore the topic in depth, and we'll build our own keys and implement the algorithm ourselves! This will be a long article, but a deep one.

You may hear about _Asymmetric-Key/Public-key Cryptosystems_, which is the umbrella under which various algorithms like RSA, Diffie-Hellman, ElGamal and so on exist. These systems provide various types of services, but all use public key systems:

-   Key pair generation
-   Encryption/Decryption of data
-   Digital Signature
-   Key exchange mechanisms

So today we'll talk about what these systems are, but mainly about one specific algorithm, RSA.

## Asymmetric Keys

Asymmetric Cryptography is one of the most common cryptography models that exist in technology. For example, to open this blog you used HTTPS, which is an HTTP protocol on top of another security protocol called [TLS](https://en.wikipedia.org/wiki/Transport_Layer_Security) (_T_ransport _L_ayer _S_ecurity). This protocol uses asymmetric cryptography.

> [!NOTE] 💡
> We'll talk about symmetric cryptography in the next part of the series

As the name suggests, it's a cryptography model that is not identical on both sides, where the two sides are **the sender and the receiver**. When we talk about symmetric cryptography, for example, both the receiver and sender of the message have the same key. This is not true in asymmetric cryptography.

In this cryptographic system, we always have a component that is known only by the key owner, this component is called a **private value** and is the value used to compose a **private key**. Another component present is the **mixed component**, which is known by both the sender (the key owner) and the message receiver. The mixed component is what will be used to make the _derivation_ of the public key from the private key.

![](./image-5.png)

Optionally these systems may also have a public value that is used to generate **public keys**, private keys, or both (Diffie-Hellman, for example, has a public value used to generate the private key).

![](./image-6.png)

The output of an asymmetric cryptography system is a **key pair**. This phrase sounds familiar, right? That's because many things we use both on the Internet and even offline use a key pair. For example, your WhatsApp messages have the famous "end-to-end encryption", and that encryption is probably asymmetric, and you own the private key.

But what are these keys anyway?

### Public keys

They are the public parts of asymmetric cryptography. The public key is what encrypts messages that can only be decrypted by its private counterpart. You'll see it being called **Pk** for _Public Key_.

Public keys are derived from private keys through a mathematical property called inversion, so the keys are not the same (not even with each other) but can produce values that can be decrypted by the private key. However, public keys cannot decrypt data encrypted by other public keys, because they are not derived from those keys but from the private key.

![](./image-7.png)

Computing the private key from the public key is computationally infeasible by definition.

So, to summarize, the public key is known to everyone and is used to encrypt messages. If you want to send me a message, you encrypt your message using **my** public key.

### Private keys

The private key (commonly called **Sk** for _Secret Key_) is a key generated from at least two private components (in the case of RSA, very large prime numbers) that are known only by the person who owns the key. This premise ensures that:

1.  The key belongs to a person, so the origin of the data is validated
2.  Nobody else has access to this key, so it can be used as a signing mechanism (which we'll cover in another article)

> [!CAUTION] 👀
> In this section we'll talk about the private key in general terms, but below we'll talk about it in the context of the RSA algorithm

Private keys are used to **decrypt** data encrypted by the public key, or to **sign** data that can be validated by the public key.[^n1] **It is not advisable to encrypt data using the private key** because any public key can decrypt that data. That's why these keys are called **signing keys** (we'll understand the concept of signing in the other articles).

![](./image-8.png)

To summarize, the private key is the opposite of the public one. It will decrypt the data, so that message you sent me that was encrypted with my Pk, will be decrypted using my Sk.

The private key **must be known only by its owner**, which is why it's private. And from it, it's possible to derive several public keys, but how is this possible?

### What is encryption?

When we talk about digital cryptography, we're no longer talking about text, we're talking about numbers. So "encrypting" something with a public key, "decrypting" something with the private key are just mathematical operations we do with a key.

![](./image-9.png)

Since we haven't yet discussed what keys are, I'll leave the deeper explanation for our RSA session, but the idea is to take a number, raise it to another number and divide by yet another number. The remainder of the division is the encrypted message (keep reading to find out what these numbers are).

## Derivation and inversion

When we say that a public key can be derived from a private key (we'll see how to do this soon), we're saying that both the public key and the **Sk** are mathematically connected.

![](./image-10.png)

The public key is the inverse of the private key (and, therefore, the private key is also the inverse of the public one), and this means that something encrypted with a public key can be decrypted by the private key.

![](./image-12.png)

Just as anything encrypted by the private key can be decrypted by any public keys. But something encrypted by a public key **cannot** be decrypted by another public key, and that's what makes asymmetric cryptography so powerful.

![](./image-11.png)

In the case of RSA, we're talking about keys that are connected through [modular exponentiation](https://en.wikipedia.org/wiki/Modular_exponentiation), and this is exactly what makes asymmetric cryptography interesting.

### Modular exponentiation

I won't dwell on this topic because it's not our main theme (besides, this paragraph is more of a curiosity than required reading), but modular exponentiation is a power operation (exponentiation) over a modulus (yes, the remainder of dividing one number by another, as in `a % b`, called [modular arithmetic](https://en.wikipedia.org/wiki/Modular_arithmetic), another topic for another time).

Modular exponentiation is when we take the remainder of some number _b_ (a base), raised to a number _x_ (exponent) and divided by a positive integer _m_ (the modulus), and this is all represented like this:

$C = b^x\mod{m}$

And C is a number that will always stay between `0` and `m`. For example, if the base is 5, the exponent is 2 and the modulus is 3:

$C = b^x\mod{m} \newline C = 5^2\mod{3} \newline C = 25\mod{3} \newline C = 1$

The result C is 1 because `25/3` is `8` with a remainder of `1`. And the great advantage of this whole system is that modular exponentiation is very efficient to compute, even for very large numbers. However, computing the inverse of this operation (the [discrete logarithm](https://en.wikipedia.org/wiki/Discrete_logarithm)), that is, what is the `x` when you have `b`, `C` and `m`, is a difficult operation, especially if you use prime numbers.

Using this mathematics, it's possible to create a value that, like a clock, will perform a _wrap around_, that is, when it reaches a certain number, it goes back to 0 (just like `a % b` in programming will always be between `0` and `b-1`)

## Asymmetric Encryption Schemes

Asymmetric cryptography is much more complex and can be up to 1000x slower than symmetric algorithms (like AES), so asymmetric algorithms (like RSA) are not used constantly, but rather together with symmetric cryptography. The combination of these two systems forms various techniques that are called _asymmetric encryption schemes._

How can these systems be used at the same time? One of the encryption schemes is called **KEM (Key Encapsulation Mechanism)**, which basically consists of encrypting one key with another key:

![](./image-1.png "Symmetric and asymmetric cryptography together")

Here we're using a symmetric key (much lighter) to encrypt a document and generate a **DEM Block.** Then we're encrypting the symmetric key we used with a user's public key, creating what is called a **KEM Block**. So far it's just one key encrypting another key.

Then we combine the two and send them to our recipient. This way, even if the document is intercepted, the key cannot be recovered because it was encrypted with the public key. The user who receives the file can decrypt it as follows:

![](./image-2.png "Decrypting a DEM Block")

We take the DEM block, separate it into key and file, decrypt the symmetric key using the private key, getting the original symmetric key, which we can use to decrypt the encrypted file.[^n2]

## RSA

After learning a lot about asymmetric cryptography, let's finally talk about RSA!

RSA stands for **Rivest-Shamir-Adleman**, and it's a cryptographic algorithm used to encrypt information, one of the oldest still in use. Created by Ron Rivest, Adi Shamir and Leonard Adleman in 1977. As we mentioned before, RSA is a relatively slow algorithm, so it's not used to encrypt large volumes of data, but rather symmetric keys.

RSA generates key pairs with sizes between 1024 and 65536 bits that can encrypt a message (which is an integer between 0 and the key size), as well as decrypt it using the private key, generate signatures and exchange keys, although the latter is not its main purpose.

Key points:

-   A good key is usually between 1024 and 4096 bits
-   The larger the key (more bits) the more computation time will be needed
-   Very large keys (like 65536 bits) are **very secure**, but very slow for practical use, since they can take hours to generate
-   Any key above 3072 bits is considered secure[^n3]

When we're "encrypting" something, we're applying a power operation between the key and the value we want to encrypt.

![](./image-13.png "A number of 4096 bytes")

The RSA public and private keys are derived from two prime numbers that we call `p` and `q`. These numbers are the private components of RSA. The security comes from these two numbers.

When using RSA, we'll calculate a number `n`, which is called the _modulus_ (there are many moduli, so don't confuse this with the _modulus_ operation we talked about above). The thing is, it's relatively easy to find primes, but it's **extremely difficult** to factor a number into its components.

A simple example: which prime numbers do we need to multiply and how many times to get 216? Factoring this small number takes 7 steps:

$216 = 2\times108\newline 108 = 2\times54\newline 216 = 2\times2\times54\newline 54 = 2\times27 \therefore 216 = 2\times2\times2\times27\newline 216=2\times2\times2\times3\times9\newline 216= 2\times2\times2\times3\times3\times3\newline 216=2^3\times3^3$

And this is a simple number, 9 bits (`100000000`), and it takes all this time. Now imagine for a number composed of two very large primes with more than 3000 bits.

> [!WARNING] 💡
> That's why many people are worried about quantum computers' ability to break RSA, because theoretically they could factor numbers much faster

## Keys in RSA

The keys in RSA are calculated with some components. We've already talked about three of them here, but I'll reiterate so we can remember them, and now I'll introduce various terms that aren't trivial:

1.  `p` and `q` are the **private** components. They must be two very large prime numbers, the larger and further apart from each other, the better.
2.  `n` is the **modulus**, it's the multiplication of `p` by `q`: `n = p*q`. This number is **public**.
3.  `e` is the **public exponent**, it's smaller and [coprime](https://en.wikipedia.org/wiki/Coprime) to the totient of `n` and is greater than 2. This number is usually _65537_ because it's a number with easy hexadecimal representation (`0x010001`).
4.  `d` is called the **private exponent** and is composed of the [modular multiplicative inverse](https://en.wikipedia.org/wiki/Modular_multiplicative_inverse) between `e` and the [Carmichael totient](https://en.wikipedia.org/wiki/Carmichael_function).

That list wasn't easy to read, right? But let's break down these steps by generating our own keys manually. But first, let's explain a concept we started way back.

### What is encryption? (in RSA)

We know that encryption is a mathematical operation, but what does it look like?

Well, a public key is not just a number, it's composed of two numbers, so you usually see a key like this:

-   `Pk = {n, e}`
-   `Sk = {n, d}`

This means that the public key is composed of our modulus `n` and the public exponent `e`. An example of a key might be this (taken from [this amazing book](https://cryptobook.nakov.com/asymmetric-key-ciphers/the-rsa-cryptosystem-concepts#rsa-public-key-example)):

```ini
n = 0xa709e2f84ac0e21eb0caa018cf7f697f774e96f8115fc2359e9cf60b1dd8d4048d974cdf8422bef6be3c162b04b916f7ea2133f0e3e4e0eee164859bd9c1e0ef0357c142f4f633b4add4aab86c8f8895cd33fbf4e024d9a3ad6be6267570b4a72d2c34354e0139e74ada665a16a2611490debb8e131a6cffc7ef25e74240803dd71a4fcd953c988111b0aa9bbc4c57024fc5e8c4462ad9049c7f1abed859c63455fa6d58b5cc34a3d3206ff74b9e96c336dbacf0cdd18ed0c66796ce00ab07f36b24cbe3342523fd8215a8e77f89e86a08db911f237459388dee642dae7cb2644a03e71ed5c6fa5077cf4090fafa556048b536b879a88f628698f0c7b420c4b7
e = 0x010001
```

While the private key is composed of our modulus and the private exponent `d`:

```ini
n = 0xa709e2f84ac0e21eb0caa018cf7f697f774e96f8115fc2359e9cf60b1dd8d4048d974cdf8422bef6be3c162b04b916f7ea2133f0e3e4e0eee164859bd9c1e0ef0357c142f4f633b4add4aab86c8f8895cd33fbf4e024d9a3ad6be6267570b4a72d2c34354e0139e74ada665a16a2611490debb8e131a6cffc7ef25e74240803dd71a4fcd953c988111b0aa9bbc4c57024fc5e8c4462ad9049c7f1abed859c63455fa6d58b5cc34a3d3206ff74b9e96c336dbacf0cdd18ed0c66796ce00ab07f36b24cbe3342523fd8215a8e77f89e86a08db911f237459388dee642dae7cb2644a03e71ed5c6fa5077cf4090fafa556048b536b879a88f628698f0c7b420c4b7
d = 0x10f22727e552e2c86ba06d7ed6de28326eef76d0128327cd64c5566368fdc1a9f740ad8dd221419a5550fc8c14b33fa9f058b9fa4044775aaf5c66a999a7da4d4fdb8141c25ee5294ea6a54331d045f25c9a5f7f47960acbae20fa27ab5669c80eaf235a1d0b1c22b8d750a191c0f0c9b3561aaa4934847101343920d84f24334d3af05fede0e355911c7db8b8de3bf435907c855c3d7eeede4f148df830b43dd360b43692239ac10e566f138fb4b30fb1af0603cfcf0cd8adf4349a0d0b93bf89804e7c2e24ca7615e51af66dccfdb71a1204e2107abbee4259f2cac917fafe3b029baf13c4dde7923c47ee3fec248390203a384b9eb773c154540c5196bce1
```

So, "encrypting" a message is nothing more than applying the following formula:

$encriptada = plano^e \mod n$

Or, let's imagine our message is `42`:

1.  We raise 42 to `e`, let's suppose `e` is 7
2.  `42` raised to 7 is `230 539 333 248`
3.  Now we divide by `n`, let's say `n` is 3977
4.  The result is `57 968 150.1755091778`, but we don't want the result, we want the remainder! which is `698`. **This is our encrypted message**

You send me this message, I receive `698`. Now I need to decrypt the message. To do this I can do the same operation, just with my values. Instead of `e` I use `d`:

$plano = encriptada^d \mod n$

1.  I raise 698 to `d`, let's say `d` is 343
2.  This will give me a number [with 976 digits](https://www.wolframalpha.com/input?i=698%5E343)
3.  Which I'll now divide by `3977` and get the remainder
4.  Which will give us [the message 42 back](https://www.wolframalpha.com/input?i=%28698%5E343%29+mod+3977)

The choice of these numbers was not arbitrary. There are some [rules that need to be followed](https://en.wikipedia.org/wiki/RSA_(cryptosystem)#Key_generation) and some non-trivial computation, but as I promised, we'll explore this in the next chapter.

## Creating keys

To generate a real key pair, we'll use TypeScript to be able to do the mathematical operations.

### Defining primes

Initially we'll need to define some numbers. First, let's start with our two primes. They are the simplest. The only rule is that they need to be large and separated, but to make our calculations easier, I'll use small prime numbers, 12 bits.

This means we can encrypt messages up to 12 bits, that is, numbers up to 4096.

-   We take `p` as `41`
-   We take `q` as `97`

The next step is to define the modulus, which is the multiplication of `q` and `p`, so:

-   `n` is `p*q` which is `41*97=3977`. Now we have the first value you saw in step 3 above (try to factor 3977 to find its primes. How many steps did it take?)[^n4]

So far we have this:

```ts
const p = 41
const q = 97
const n = p*q
```

### Defining exponents

Defining exponents is trickier. We'll need an intermediate step: defining the totient of `n`.

This can be done through Carmichael's function (expressed by the letter Lambda _`λ(n)`_) or by [Euler's totient](https://en.wikipedia.org/wiki/Euler%27s_totient_function) (expressed by the letter Phi `_φ_(n)_`), which is considerably simpler, but produces larger `e` and `d`, so the calculations are more complicated.

I'm not a mathematician, so I won't complicate things here. To solve _`λ(n)`_, we need to find the least common multiple between `p-1` and `q-1`. This can be done with the [Euclidean algorithm](https://en.wikipedia.org/wiki/Euclidean_algorithm):

$\lambda({n}) = \frac{|(p-1)(q-1)|}{mdc((p-1),(q-1))}$

Where `mdc` is the greatest common divisor between `p-1` and `q-1`. So our calculation becomes:

$\lambda({3977}) = \frac{|40\times96|}{mdc(40,96)}$

JavaScript doesn't have a function to calculate GCD, so let's code one quickly here using the Euclidean algorithm. We can apply it recursively:

```ts
function mdc (a: number, b: number) {
  if (b === 0) return a
  return mdc(Math.abs(b), Math.abs(a)%Math.abs(b))
}
```

But it's slower, especially for large numbers, so let's apply it iteratively:

```ts
function mdc(a: number, b: number) {
  let absA = Math.abs(a)
  let absB = Math.abs(b)

  while (absB) {
    ;[absB, absA] = [absA % absB, absB]
  }

  return absA
}
```

Now we can calculate _`λ(n)`_, which will be:

```ts
function mdc(a: number, b: number) {
  let absA = Math.abs(a)
  let absB = Math.abs(b)

  while (absB) {
    ;[absB, absA] = [absA % absB, absB]
  }

  return absA
}

const p = 41
const q = 97
const n = p * q // 3977
const lambdaN = Math.abs((p-1)*(q-1))/mdc(p - 1, q - 1).mdc // 480
```

With these numbers we can calculate `d` and `e`. Let's go for `e` first because `d` depends on it.

`e` needs to be a small number, but it also needs to be a number greater than 2 and less than _`λ(n)`_. So we can't use 65537 because our _`λ(n)`_ is 8. Also, the GCD between `e` and _`λ(n)`_ must be 1. So let's make a function that calculates this:

```ts
function publicExponent (lambdaN: number) {
  let e = 2
  while (mdc(e, lambdaN) !== 1 || e < lambdaN) {
    e++
  }
  return e
}
```

In our case, `e` will be 7, a small number. So far we have this:

```ts
function mdc(a: number, b: number) {
  let absA = Math.abs(a)
  let absB = Math.abs(b)

  while (absB) {
    ;[absB, absA] = [absA % absB, absB]
  }

  return absA
}

function publicExponent (lambdaN: number) {
  let e = 2
  while (mdc(e, lambdaN) !== 1 && e < lambdaN) {
    e++
  }
  return e
}

const p = 41
const q = 97
const n = p * q // 3977
const lambdaN = Math.abs((p-1)*(q-1))/mdc(p - 1, q - 1) // 480
const e = publicExponent(lambdaN) // 7
```

Now let's calculate `d`, which must be a modular multiplicative inverse of `e`. That is, we need to calculate this:

$d \equiv e^{-1}(\mod(\lambda{n}))$

This means `d` is a number that, when multiplied by `e`, results in a number that is `1 mod(λ(n))`.

To calculate this value, we can modify our GCD to use the [extended algorithm](https://en.wikipedia.org/wiki/Extended_Euclidean_algorithm), which will compute not just the two divisors, but also two coefficients called `x` and `y` that satisfy an identity called [Bézout's identity](https://en.wikipedia.org/wiki/Bézout%27s_identity).

> This identity says that for all GCDs there are two numbers (called coefficients) that can be used as multipliers of a linear function `ax + by = mdc(a, b)`. That is, the greatest common divisor between `a` and `b` can be expressed as a function of the parameters themselves. Our number `d` is one of these coefficients.

Let's modify the code to reflect this according to [this implementation](https://en.wikipedia.org/wiki/Extended_Euclidean_algorithm#pseudocode):

```ts
function mdc(a: number, b: number) {
  let [absA, absB] = [Math.abs(a), Math.abs(b)]
  let [prevX, x] = [1, 0]
  let [prevY, y] = [0, 1]

  while (absB) {
    const q = Math.floor(absA / absB)
    ;[absB, absA] = [absA % absB, absB]
    ;[x, prevX] = [prevX - q * x, x]
    ;[y, prevY] = [prevY - q * y, y]
  }

  return {
    mdc: absA,
    x: prevX,
    y: prevY
  }
}
```

To do this we'll also modify the other code to be able to correct the function return, which is now an object, and already create our modular inverse function. We end up with this:

```ts
function mdc(a: number, b: number) {
  let [absA, absB] = [Math.abs(a), Math.abs(b)]
  let [prevX, x] = [1, 0]
  let [prevY, y] = [0, 1]

  while (absB) {
    const q = Math.floor(absA / absB)
    ;[absB, absA] = [absA % absB, absB]
    ;[x, prevX] = [prevX - q * x, x]
    ;[y, prevY] = [prevY - q * y, y]
  }

  return {
    mdc: absA,
    x: prevX,
    y: prevY
  }
}

function modInverse(e: number, m: number) {
  const result = mdc(e, m)
  if (result.mdc !== 1) {
    throw new Error('modular inverse does not exist')
  }
  return ((result.x % m) + m) % m
}

function publicExponent(lambdaN: number) {
  let e = 2
  while (mdc(e, lambdaN).mdc !== 1 && e < lambdaN) {
    e++
  }
  return e
}

const p = 41
const q = 97
const n = p * q // 3977
const lambdaN = Math.abs((p-1)*(q-1))/mdc(p - 1, q - 1).mdc // 480
const e = publicExponent(lambdaN) // 7
const d = modInverse(e, lambdaN) // 343
```

Note that our `d` is our `x` from the modular function. What we're doing is getting the remainder of `x` by `λ(n)`, then we add `λ(n)` to ensure the result is positive, and we get the remainder by `λ(n)` again to keep the value between 0 and `λ(n)-1`.

Now that we have `d`, `e` and `n`, we don't need `p`, `q` or `λ(n)` anymore. `d` must be kept **private**.

Let's create a function to encrypt and decrypt our data. Since it's the same function, we'll just change the values passed.

### Encrypting by hand

The final encryption function is very simple:

```ts
function encrypt(message: number, exponent: number, mod: number) {
  return (message ** exponent) % mod
}
```

And we can test it!

```ts
const message = 42
const encrypted = encrypt(message, e, n) // 698
const decrypted = encrypt(encrypted, d, n) // NaN
```

Oh! What happened? Why are we getting `NaN`? If we go back a bit in the process, we'll see that the decryption process is much more complex because we're raising a message to a large `d`, so our message exceeds the 52 bits that JavaScript can store in memory. For this we'll need to use BigInts!

Our encryption function becomes like this, right?

```ts
function encrypt(message: number|bigint, exponent: number, mod: number) {
  return (message**exponent) % BigInt(mod)
}
```

Wrong! BigInts don't support the `**` operator because it tries to convert to `number` at the end. We'll have to create our own power function, which is very simple. We just need to iterate through the exponent number and multiply several times:

```ts
function bigIntPower(base: number|bigint, exponent: number) {
  let result = 1n
  const bigBase = BigInt(base)
  for (let i = 0; i < exponent; i++) {
    result *= bigBase
  }
  return result
}
```

Now we can use it inside our encryption function:

```ts
function encrypt(message: number|bigint, exponent: number, mod: number) {
  return bigIntPower(message, exponent) % BigInt(mod)
}
```

Now yes!

```ts
const message = 42
const encrypted = encrypt(message, e, n) // 698n
const decrypted = encrypt(encrypted, d, n) // 42n
```

To finish this part, we can create a keyset in a nice object:

```ts
type Key = { exp: number, mod: number }
const publicKey = { exp: e, mod: n }
const privateKey = { exp: d, mod: n }
```

And we modify the encryption function to accept a key:

```ts
function encrypt(message: number|bigint, key: Key) {
  return bigIntPower(message, key.exp) % BigInt(key.mod)
}
```

And we end up with this final code (see the [gist](https://gist.github.com/khaosdoctor/aa2995b56caabf13f086ef6ee44efd6e)):

```ts
/**
 * Calculates the power of a bigInt number
 * JS does not support integers larger than 2^53-1
 * and BigInts cannot be used with the ** operator, so
 * this function was created
 */
function bigIntPower(base: number|bigint, exponent: number) {
  let result = 1n
  const bigBase = BigInt(base)
  for (let i = 0; i < exponent; i++) {
    result *= bigBase
  }
  return result
}

/** 
 * Calculates the gcd of two numbers and Bézout coefficients
 * using the extended Euclidean algorithm
 */
function mdc(a: number, b: number) {
  let [absA, absB] = [Math.abs(a), Math.abs(b)]
  let [prevX, x] = [1, 0]
  let [prevY, y] = [0, 1]

  while (absB) {
    const q = Math.floor(absA / absB)
    ;[absB, absA] = [absA % absB, absB]
    ;[x, prevX] = [prevX - q * x, x]
    ;[y, prevY] = [prevY - q * y, y]
  }

  return {
    mdc: absA,
    x: prevX,
    y: prevY
  }
}

/**
 * Calculates the modular inverse of a number
 */
function modInverse(e: number, m: number) {
  const result = mdc(e, m)
  if (result.mdc !== 1) {
    throw new Error('modular inverse does not exist')
  }
  return ((result.x % m) + m) % m
}

/**
 * Calculates the public exponent of an RSA key
 */
function publicExponent(lambdaN: number) {
  let e = 2
  while (mdc(e, lambdaN).mdc !== 1 && e < lambdaN) {
    e++
  }
  return e
}

/**
 * Encrypts/Decrypts a message using the RSA key
 */
function encrypt(message: number|bigint, key: Key) {
  return bigIntPower(message, key.exp) % BigInt(key.mod)
}

const p = 41 // small prime number p
const q = 97 // small prime number q
const n = p * q // modulus n = 3977
const lambdaN = Math.abs((p-1)*(q-1))/mdc(p - 1, q - 1).mdc // Carmichael totient = 480
const e = publicExponent(lambdaN) // public exponent 7
const d = modInverse(e, lambdaN) // private exponent 343

// Keys
type Key = { exp: number, mod: number }
const publicKey = { exp: e, mod: n }
const privateKey = { exp: d, mod: n }

// Usage example
const message = 42
const encrypted = encrypt(message, publicKey) // 698n
const decrypted = encrypt(encrypted, privateKey) // 42n -> original message
```

### Euler variation

If you've read this far, congratulations, it wasn't easy! But I wanted to show you one more thing! Remember I mentioned that we can use Euler's totient instead of Carmichael's totient, and it's much simpler?

Well, actually we're already using this totient. Euler's totient (`φ(n)`) is defined as the multiplication of `p-1` by `q-1`. This is our function today:

```ts
const lambdaN = Math.abs((p-1)*(q-1))/mdc(p - 1, q - 1).mdc
```

Mathematically prettier:

$\lambda{n} = \frac{|(p-1)*(q-1)|}{mdc(p-1, q-1)}$

Look at the numerator there, we're dealing with φ. So if we remove the second part (the division) we won't have any change in the result:

```ts
const lambdaN = Math.abs((p-1)*(q-1))

// ... the rest of the code here

const message = 42
const encrypted = encrypt(message, publicKey) // 698n
const decrypted = encrypt(encrypted, privateKey) // 42n -> original message
```

What changes then? `φ(n)` is much larger than `λ(n)`. While `λ(n)` is 480, `φ(n)` is 3840. This will affect performance. Remember we're doing one iteration per value inside the GCD function. The larger the number, the more iterations we have to do. So keeping numbers smaller is better!

Anyway, you can see the variation [here](https://gist.github.com/khaosdoctor/549d1a62e840974e8cd75518d1826273).

## Conclusion

This was one of the longest articles I've ever written, but I believe it was well worth it. We explored RSA in depth and how it works. We created two keys manually and tested manual encryption. And now?

To encrypt text or any other non-numeric value, you need to convert that message to a number between 0 and your key size. In our case we used a small key, but if the value exceeds that key, we'll have an encryption problem. You can convert any string to a binary value and use the same functions!

The code for both implementations is [here](https://gist.github.com/khaosdoctor/aa2995b56caabf13f086ef6ee44efd6e) and [here](https://gist.github.com/khaosdoctor/549d1a62e840974e8cd75518d1826273), and we'll see you next time with symmetric keys!

See you later folks!

[^n1]: Asymmetric cryptography is a **cryptographic system** (_cryptosystem_) that is implemented by various algorithms. **One of them** is RSA, but it's not the only one. Therefore there are various private key implementations, but they'll all have the same properties.

[^n2]: The HTTPS protocol works "more or less" like this.

[^n3]: When we talk about keys here, we're talking about numbers, nothing more. It's like a password, except it has 1234 digits (`2^4096`).

[^n4]: Remember that `p` and `q` are private. They cannot be disclosed, while `n` is public.
