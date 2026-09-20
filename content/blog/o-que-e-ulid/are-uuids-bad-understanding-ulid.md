---
title: Are UUIDs bad? Understanding ULID
pubDate: 2024-08-14T11:00:09.000Z
updatedDate: 2026-07-16T17:54:00.000Z
category: technology
tags: ["computing", "architecture", "databases"]
lang: en
description: How can you implement random IDs that are also sortable? Meet ULIDs and what they promise to change!
slug: are-uuids-bad-understanding-ulid
machineOwnedTranslation: true
draft: false
heroImage: ./cover-en.png
---

In development, the ability to generate unique IDs has always been necessary, especially when dealing with large volumes of data. Over time we encountered another problem: we can't only generate sequential IDs. They have several problems, one of which is that they are predictable and susceptible to external attacks.

So we created several other types of IDs. One example is [Snowflake](https://en.wikipedia.org/wiki/Snowflake_ID), which is the type of ID used by Twitter to create IDs that would be unique in distributed computing (which has the additional complication of potentially generating the same ID in two different places without one knowing about the other). But what really took off was the UUID protocol, or _Universal Unique IDentifiers_.

But recently, we had an addition to our toolkit, ULIDs. Let's understand what they are. But first we need to understand a bit about UUIDs.

## UUIDs

The UUID model was originally proposed in an [RFC](https://datatracker.ietf.org/doc/html/rfc4122), and later moved to [RFC-9562](https://datatracker.ietf.org/doc/html/rfc9562). UUIDs now have 8 versions, each one is a bit different from the others and has some special uses.

-   [UUID V1](https://www.rfc-editor.org/rfc/rfc9562.html#name-uuid-version-1): Generated from a timestamp, a monotonic counter, and a MAC address. It has 128 bits like the others, where the first 60 are reserved for a timestamp in nanoseconds since October 15, 1582.
-   UUID V2: It is outside the original specification because it is reserved for security IDs, almost no one uses them today.
-   [UUID V3](https://www.rfc-editor.org/rfc/rfc9562.html#name-uuid-version-3): IDs generated from an MD5 hash created by the user. As you can imagine, they are not very random. They contain only 2 bits of variance and are used more as individual identifiers, which doesn't make much sense.
-   [UUID V4](https://www.rfc-editor.org/rfc/rfc9562.html#name-uuid-version-4): The most common of all IDs, it is generated from completely random data. This is what most of us use to store data in DBs, etc.
-   [UUID V5](https://www.rfc-editor.org/rfc/rfc9562.html#name-uuid-version-5): A slightly better implementation than version 3, uses SHA1 (which is also no longer ideal). But still, somewhat unused.
-   [UUID V6](https://www.rfc-editor.org/rfc/rfc9562.html#name-uuid-version-6): This is exactly like V1, except the bit order was changed so that when sorted, it can be sorted by creation date.
-   [UUID V7](https://www.rfc-editor.org/rfc/rfc9562.html#name-uuid-version-7): The closest implementation we have to ULID, it is a timestamp and random data. Being 48 bits of timestamp, 4 of version, 2 of variance, and 74 of randomness.
-   [UUID V8](https://www.rfc-editor.org/rfc/rfc9562.html#name-uuid-version-8): V8 is the customized version of UUID, the only two fields that are required are version and variance.

### How do we create a UUID?

All UUIDs have 128 bits, they all have 4 bits for version, which is literally a number showing what version it is, for example, UUID V4 would have this bit equal to `0b0100`, which is 4 in binary, and 7 would be `0b0111` and so on.

> `0bxxx` means a binary number, for example, `0b1010` is the same as 10 in binary

The variant is always started as `0b10`, in binary `0010` would be two, but this 10 has another meaning that we'll see in a moment. This is why every UUID v4 will have a `4` in the third block:

```
919108f7-52d1-4320-9bac-f847db4148a8
              ^ver ^var
```

Overall, V1 and V6 are obsolete and should be replaced by 7, v2 is reserved for computational security, and v3 became obsolete with v5. So the ones that matter are 4, 5, 7, and 8.

### A real example

![](./image-11.png)

These are 4 blocks of 32 bits (from 0-3, counting 0-9 in each). The first 48 bits (from 0 to 32 in block 3, added with 6) are designated for the first random set `random_a`, then we have from octet 6 to bit 9 of the first block the version `ver`, in this case it's `0b0100`, then we have another 12 bits of random data `random_b`, the variance which is always `0b10`, and the other 62 final bits are `random_c`, so it works like this:

1.  128 bits are 16 bytes, we can generate random data of 16 bytes in hex `975e79e12bef34bd33bb11ea33560517`, this representation has 32 characters, remembering that each hexadecimal character has 4 bits, so 4 bits \* 32 chars = 128 bits.

> [!NOTE] 💡
> Usually you'll see the representation of hexadecimal numbers in a buffer, and a buffer is an array of bytes, that is, an array of 8 bits in each position: `0000 1111` where each quartet is a hexadecimal number.
>
> That's why the representation as a string would be something like `97 5e 79 e1...`

1.  Now we define our bits
    1.  48 bits of random: 48 bits are 6 bytes (48/8) so they are the first 12 letters `975e79e12bef`, to maintain block separation, we divide into 8 and 4 chars `975e79e1-2bef`
    2.  4 bits of version: fixed at `0b0100`
    3.  12 bits of randomness: 12 bits can be understood as 1 full byte and half a byte, so the next 3 letters, but we already took one letter that is the version, so we skip the next one which is 3 and take `4bd`
    4.  2 bits of variance: fixed at `0b10`
    5.  62 bits of randomness: starting from `4bd`, there are 7 more bytes (7\*8 = 56 bits) and another 6 bits so that's 14 letters plus 1 extra letter, but skipping the first 3 (from `33bb`) because we have half a bit separated for variance `3bb11ea33560517`
2.  If we separate everything we'll have something like this:

![](./image-13.png)

4.  But this doesn't add up. We have two bits missing, we remove one of the characters (at position `v3bb`) to place the variance, but the variance is `0b10`, not `0b0010`. Well, that's why we calculate the hexadecimal first, so imagine we have this here:

```
975e79e1-2bef-34bd-33bb-11ea33560517
xxxxxxxx-xxxx-Vxxx-vxxx-xxxxxxxxxxxx
```

5.  To replace the version `V`, we can simply ignore the number that's there (which is 3) and put a 4 in its place because we have 4 bits for version, which is enough for a hexadecimal number:

```
975e79e1-2bef-34bd-33bb-11ea33560517 -- initial
xxxxxxxx-xxxx-4xxx-vxxx-xxxxxxxxxxxx -- mask
975e79e1-2bef-44bd-33bb-11ea33560517 -- final
```

6.  Now for the variance bit, since we only have 2 bits, we need to fill the two missing bits with the first two most significant bits of the next number, in our case the number at the `v` position in the mask is 3, so `0b0011`, since we fixed the first two of the variance at `0b10`, we need to take the first two of the next number and discard the rest, the final number is `0b1000`, which is 8:

```
975e79e1-2bef-34bd-33bb-11ea33560517 -- initial
xxxxxxxx-xxxx-4xxx-vxxx-xxxxxxxxxxxx -- mask
975e79e1-2bef-44bd-83bb-11ea33560517 -- final
```

In JavaScript (Node) we can do this with buffers, like this:

```js
const randombuf = crypto.randomBytes(16)
Buffer.concat([
  randombuf.subarray(0,6), // 48 bits, 6 bytes
  Buffer.from([(randombuf[6] & 15) | 64]), // 4 bits of version + 4 existing bits
  randombuf.subarray(7,8), // 1 byte
  Buffer.from([(randombuf[8] & 63 ) | 128]), // concatenates the variance
  randombuf.subarray(8) // rest
])
```

Which we can simplify with a single buffer:

```js
const randombuf = crypto.randomBytes(16)
const result = Buffer.alloc(16)
randombuf.copy(result, 0, 0, 6)
result[6] = (randombuf[6] & 15) | 64
result[7] = randombuf[7]
result[8] = (randombuf[8] & 63) | 128
randombuf.copy(result, 9, 9, 16)
```

But what are these magic numbers? 15, 63, 128? They are the decimal representation of the binary numbers `0000 1111` or `0f` which is 15, `0011 1111` or `3f` which is 63, and `1000 0000` or `80` which is 128. Essentially these operations are done to remove bits directly, for example, our version bit is 3, it's in the 6th byte which is `34`:

```
V = 0x34 or 0011 0100
# We need to zero out the first 4 bits while keeping the last 4
# to do this we can do an and with 0000 1111 which is 0x0f

0011 0100
    &
0000 1111
---------
0000 0100 # 0x04

# Now we can "add" with 4
# which would be an OR with the number 0x40 which is 64 or 0100 0000

0000 0100
    +
0100 0000
---------
0100 0100 # 0x44
```

For comparison purposes, this is the functionality implemented in the [UUID](https://www.npmjs.com/package/uuid) module on NPM:

```ts
function v4(options?: Version4Options, buf?: Uint8Array, offset?: number): UUIDTypes {
  options ??= {};

  if (native.randomUUID && !buf && !options) {
    return native.randomUUID();
  }

  options = options || {};

  const rnds = options.random || (options.rng || rng)();

  // Per 4.4, set bits for version and `clock_seq_hi_and_reserved`
  rnds[6] = (rnds[6] & 0x0f) | 0x40;
  rnds[8] = (rnds[8] & 0x3f) | 0x80;

  // Copy bytes to buffer, if provided
  if (buf) {
    offset = offset || 0;

    for (let i = 0; i < 16; ++i) {
      buf[offset + i] = rnds[i];
    }

    return buf;
  }

  return unsafeStringify(rnds);
}
```

Again, it generates a random buffer first, then does a **bitwise and** with `0x0f`, which in binary is `0000 1111`, that is, it's discarding the first block, then doing a **bitwise or** with `0x40` which is `0100 0000`, replacing the first quartet with `0b0100`:

```
# Random
rnds[6] = 0x8a => 1000 1010
1000 1010 & 0x0f = 1000 1010 & 0000 1111

1000 1010 # 0x8a
    &
0000 1111 # 0x0f
---------
0000 1010 # now we add (+ is an or) with 0x40
    +
0100 0000 # 0x40
---------
0100 1010 # 0x4a
```

For the variance it's taking the value at position 8, removing the first two bits of the first quartet through AND with `0x3f` which is 63 in decimal, with the first two bits zeroed, we can replace them with `0b1000` which is 8 in decimal, but since we have a full byte, it would be `1000 0000` which is 128 in decimal:

```
# Random
rnds[8] = 0x75 => 0111 0101
0111 0101 & 0x3f = 0111 0101 & 0011 1111

0111 0101 # 0x75
    &
0011 1111 # 0x3f
---------
0011 0101 # now we add (+ is an or) with 0x80
    +
1000 0000 # 0x80
---------
1011 0101 # 0xb5
```

The thing is, the first block of the ID is not sortable, it's just a random number from a buffer.

## ULID

ULID means _Universally Unique Lexicographically Sortable Identifiers_, it is an ID compatible with UUIDs, also with 128 bits. ULIDs are case sensitive, and they don't have any other special characters so we can use them in URLs, just like UUIDs.

The difference is that the layout of a ULID is much simpler.

```
 01AN4Z07BY      79KA1307SR9X4MV3

|----------|    |----------------|
 Timestamp           Random
   48bits             80bits
```

The timestamp is a 48-bit integer representing UNIX time in milliseconds, while the randomness is 80 bits of generic random data. The main difference, as the name says, is that they are alphabetically sortable. In addition, they are not encoded using hexadecimal, but an algorithm called [Base32](https://www.crockford.com/base32.html) (which was created by Douglas Crockford, who is also the creator of JSON), so the number of symbols is quite limited:

```
0123456789ABCDEFGHJKMNPQRSTVWXYZ
```

This makes the ID smaller (26 letters instead of 32), which is more space efficient. However it has a tricky part, it's possible that there are collisions if two ULIDs are generated in the same millisecond, which is not uncommon in distributed systems. When this is detected (however it is), the random component is incremented by 1 at the least significant bit, remember that it uses [big endian](https://en.wikipedia.org/wiki/Endianness) notation, so the most significant bits are on the left, therefore the least significant ones are on the right.

While the comparison is somewhat uncertain and even a bit unfair, ULIDs have some advantages over UUIDs:

1.  They are smaller, 26 instead of 32 characters, saving at least 6 bytes per ID
2.  Lexical ordering, although this is not a major point of comparison because UUID v7 is also sortable, just not lexically
3.  Advantages in database storage
    1.  When using ordered indexes, ULIDs can take advantage of the same order and be more performant
    2.  If you are storing time series data, ULIDs can be stored and retrieved in order without needing any further sorting
4.  Another point I consider an advantage is that ULIDs are more readable than UUIDs

## Conclusion

In the end this article ended up being more about UUID than ULID itself 🤣, but I hope you've learned how UUIDs work.

Overall, ULIDs are a good option when you want to generate data that needs to be sorted or searched lexically. For small applications I don't think it would have much impact, but for large distributed applications you can have both space savings and performance gains by using ULIDs lexically.

However, ULIDs are not very common, chances are you'll have to implement your own generator or your own validator. Libraries like [Zod](https://zod.dev) already implement validations for ULID, but Node, for example, does not implement a ULID generator and won't because ULID is not based on any IETF RFC, which makes it riskier since it's a protocol that may or may not survive for decades (the same applies to Snowflake, for example).

My suggestion is, don't use ULIDs unless it's absolutely necessary, prefer testing UUID v7 for data that can be sortable first.
