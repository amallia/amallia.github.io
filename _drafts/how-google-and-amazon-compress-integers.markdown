---
title: How Google and Amazon compress integers
description: This blog post will introduce a non-negative integer compression technique called Varint or Variable Byte (or just VByte), and all the evolutions like VarintGB, VarintG8IU, MaskedVByte and StreamVByte.
tags:
    - compression
    - data structures
    - VByte
    - Varint
    - Variable Byte
layout: post
image: /uploads/integers-compression.jpg

---
![integers-compression]({{ site.url }}/uploads/integers-compression.jpg){:class="img-responsive"}

I have been blogging about integer compression for a while now, I hope you find this topic particularly interesting as I do. Anyway, it is definitely a research area whose improvements are appealing even for big companies like Google and Amazon.

This blog post will introduce a non-negative integer compression technique called **Varint** or **Variable Byte** (or just VByte), which does not need to have a sorted input to work as it is for [Elias-Fano]({{ site.url }}{% post_url 2018-01-06-sorted-integers-compression-with-elias-fano-encoding %}).

One difference with many other compression algorithms is that VByte is a byte aligned codec. Bit-aligned codes can be inefficient to decode as they require several bitwise operations, so byte-aligned or word-aligned codes are usually preferred if speed is a main concern. Moreover, VByte - as you will see - is an extremely simple compression method, this obviously contribute to its popularity.
As you may have already imagined the biggest VByte drawback is its compression effectiveness, as small integers are still compressed with a minimum of 8 bits and bigger ones still need 16, 24 or 32 bits without intermediate values.



## Basic idea

There exist several variations of VByte, the most important ones will be introduced in the following paragraphs, but first I would like to pitch the  idea behind the simpler version.

A binary representation of a non-negative integer *x* is split into groups of of 7 bits which are represented as a sequence of bytes. The lower 7 bits of each byte store the data, whereas the eighth bit, called the continuation bit, indicates whether the current chunk is the last one or whether there are more to follow.


Google uses Varint in [protocol buffer](https://developers.google.com/protocol-buffers/docs/encoding) and [Dropbox](https://blogs.dropbox.com/tech/2016/09/improving-the-performance-of-full-text-search/) in their full-text search engine.

### Encoding and decoding in code

The following code is to show how simple is the implementation of the function used to encode a value according to the VByte format.
*128* is the maximum value representable with 7 bits, so if the value is greater than 128 its first 7 bits are written into the output buffer, preceded by a set bit. The value is iteratively shifted by 7 bits, which corresponds to a division by 128. Finally, when the value is less than 128 its bits are streamed out without appending a set bit.

```cpp
size_t encodeVByte(uint64_t val, uint8_t* out)
{
  uint8_t* p = out;
  while (val >= 128) {
    *p++ = 0x80 | (val & 0x7f);
    val >>= 7;
  }
  *p++ = uint8_t(val);
  return size_t(p - out);
}
```

Decoding is not more complex than encoding. It basically does the same operations to extract 7 bits at the time and flush them into the output value.

```cpp
uint64_t decodeVByte(const uint8_t* in)
{
  uint32_t val = 0;
  int shift = 0;
  while (*in >= 128) {
    val |= static_cast<uint32_t>(*in++ & 0x7f) << shift;
    shift += 7;
  }
  val |= static_cast<uint64_t>(*in++) << shift;
  return val;
}
```

## VarintGB

As pointed out by Jeff Dean during his keynote at WSDM in 2009, one of the biggest issue with Varint is that decoding requires lots of branches/shifts/masks.
They replaced VByte with something called Group Varint, or just VarintGB. The main idea behind it is to pack integers in blocks of four. In this way, the number of branches misprediction is drastically reduced.

Google uses VarintGB for search purposes (at least this was the case in 2009).

## VarintG8IU

Stepanov et al. [^fnVarintG8IU] present a variant of Variable Byte (called VarintG8IU) which exploits SIMD operations of modern CPUs to further speed up decoding.
Consecutive numbers are grouped in 8-byte blocks, preceded by a 1-byte descriptor containing unary-encoded lengths (in bytes) of the integers in the block.
If the next integer cannot fit in a block, the remaining bytes are unused.

This scheme was patented by Amazon ([US20120221539A1](https://patents.google.com/patent/US20120221539)), so it cannot be used in commercial or open-source projects.

## MaskedVByte and StreamVByte

More recently Daniel Lemire et al. came up with new ideas regarding vectorization of the VByte decoding process [^fnMasked] [^fnStream].

MaskedVByte encodes integers according to the original VByte format. Decoding proceeds by first gathering the most significant bits
of consecutive bytes using a dedicated SIMD instruction.
Then, using previously-built look-up tables and a shuffle instruction, the data bytes are permuted to obtain the original integers.

StreamVByte, combines the benefits of VarintG8IU and Group Varint. Like Group Varint, it stores four integers per block with a 1-byte descriptor. Thus, blocks have variable lengths, which for Group Varint means that the locations of these descriptors cannot be easily predicted by the CPU.
StreamVByte avoids this issue by storing all descriptors sequentially in a separate stream, allowing to decode multiple
control bytes simultaneously and reducing branch mispredictions.

MaskedVbyte is used in production at Indeed in Imhotep, their data analytics platform.
Some cool projects like [Redisearch](https://github.com/RedisLabsModules/RediSearch) and [UpscaleDB](https://github.com/cruppstahl/upscaledb) are using StreamVByte.

## Conclusion

The Variable Byte family still represent an important element when it comes to compression of integers. Because of its fast sequential decoding speed it is widely adopted by well-known companies.

## References

[^fnMasked]: Jeff Plaisance, Nathan Kurz, Daniel Lemire, Vectorized VByte Decoding, International Symposium on Web Algorithms 2015, 2015. http://arxiv.org/abs/1503.07387.

[^fnStream]: Daniel Lemire, Nathan Kurz, Christoph Rupp, Stream VByte: Faster Byte-Oriented Integer Compression, Information Processing Letters 130, 2018.

[^fnVarintG8IU]: Alexander A. Stepanov, Anil R. Gangolli, Daniel E. Rose, Ryan J. Ernst, and Paramjit S. Oberoi. 2011. SIMD-based decoding of posting lists. In Proceedings of the 20th ACM international conference on Information and knowledge management (CIKM 11).

[^fnBmw]: Shuai Ding and Torsten Suel. 2011. Faster top-k document retrieval using block-max indexes. In Proceedings of the 34th international ACM SIGIR conference on Research and development in Information Retrieval.

